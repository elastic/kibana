/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { recurse } from 'cypress-recurse';
import type { UsageRecord } from '@kbn/security-solution-serverless/server/types';
import { METERING_SERVICE_BATCH_SIZE } from '@kbn/security-solution-serverless/server/constants';
import {
  getInterceptedRequestsFromTransparentApiProxy,
  startTransparentApiProxy,
  stopTransparentApiProxy,
} from '../../tasks/transparent_api_proxy';
import type { ReturnTypeFromChainable } from '../../types';
import { indexEndpointHeartbeats } from '../../tasks/index_endpoint_heartbeats';
import { login, ROLE } from '../../tasks/login';

describe(
  'Metering',
  {
    tags: ['@serverless', '@skipInServerlessMKI'],
    env: {
      ftrConfig: {
        kbnServerArgs: [
          `--xpack.securitySolutionServerless.usageReportingTaskInterval=1m`,
          `--xpack.securitySolutionServerless.usageReportingApiUrl=https://localhost:3623`,
        ],
      },
    },
  },
  () => {
    const HEARTBEAT_COUNT = 2001;

    let endpointData: ReturnTypeFromChainable<typeof indexEndpointHeartbeats> | undefined;

    before(() => {
      login(ROLE.system_indices_superuser);
      startTransparentApiProxy({ port: 3623 });
      indexEndpointHeartbeats({
        count: HEARTBEAT_COUNT,
      }).then((indexedHeartbeats) => {
        endpointData = indexedHeartbeats;
      });
    });

    after(() => {
      if (endpointData) {
        endpointData.cleanup();
        endpointData = undefined;
      }
      stopTransparentApiProxy();
    });

    describe('Usage Reporting Task', () => {
      it('properly sends indexed heartbeats to the metering api', () => {
        const expectedChunks = Math.ceil(HEARTBEAT_COUNT / METERING_SERVICE_BATCH_SIZE);

        recurse(
          getInterceptedRequestsFromTransparentApiProxy,
          (res: UsageRecord[][]) => {
            if (res.length === expectedChunks) {
              expect(res).to.have.length(expectedChunks);

              for (let i = 0; i < expectedChunks; i++) {
                if (i < expectedChunks - 1) {
                  expect(res[i]).to.have.length(METERING_SERVICE_BATCH_SIZE);
                } else {
                  // The last or only chunk
                  expect(res[i]).to.have.length(
                    HEARTBEAT_COUNT % METERING_SERVICE_BATCH_SIZE || METERING_SERVICE_BATCH_SIZE
                  );
                }
              }

              const allHeartbeats = res.flat();
              expect(allHeartbeats).to.have.length(HEARTBEAT_COUNT);
              expect(allHeartbeats[0].id).to.contain('agent-0');
              expect(allHeartbeats[HEARTBEAT_COUNT - 1].id).to.contain(
                `agent-${HEARTBEAT_COUNT - 1}`
              );
              return true;
            }
            return false;
          },
          {
            delay: 15 * 1000,
            timeout: 2 * 60 * 1000,
          }
        );
      });
    });
  }
);
