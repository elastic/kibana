/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates APM data that is dependent on the Elasticsearch version for service summary fields.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { ApmSynthtracePipelineSchema, apm } from '@kbn/synthtrace-client';
import { random } from 'lodash';
import semver from 'semver';
import type { Scenario } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';
import type { RunOptions } from '@kbn/synthtrace';
import type { Logger } from '@kbn/synthtrace';

const scenario: Scenario<ApmFields> = async ({
  logger,
  versionOverride,
}: RunOptions & { logger: Logger }) => {
  const version = versionOverride as string;
  const isLegacy = version ? semver.lt(version as string, '8.7.0') : false;
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const successfulTimestamps = range.ratePerMinute(6);
      const instance = apm
        .service({
          name: `java`,
          environment: 'production',
          agentName: 'java',
        })
        .instance(`instance`);

      return withClient(
        apmEsClient,
        successfulTimestamps.generator((timestamp) => {
          const randomHigh = random(1000, 4000);
          const randomLow = random(100, randomHigh / 5);
          const duration = random(randomLow, randomHigh);
          return instance
            .transaction({ transactionName: 'GET /order/{id}' })
            .timestamp(timestamp)
            .duration(duration)
            .success();
        })
      );
    },
    setupPipeline: ({ apmEsClient }) => {
      if (isLegacy) {
        apmEsClient.setPipeline(
          apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Default, {
            versionOverride: version,
          })
        );
      }
    },
  };
};

export default scenario;
