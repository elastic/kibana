/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThrottlingConfig } from '../../../common/runtime_types';
import { monitorAttributes } from '../../../common/types/saved_objects';
import { ConfigKey } from '../../../common/constants/monitor_management';
import { syntheticsMonitorType } from '../../legacy_uptime/lib/saved_objects/synthetics_monitor';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SYNTHETICS_API_URLS } from '../../../common/constants';

interface AggsResponse {
  profiles: {
    buckets: Array<{
      doc: {
        hits: {
          hits: Array<{
            _source: {
              'synthetics-monitor': {
                [ConfigKey.THROTTLING_CONFIG]: ThrottlingConfig;
              };
            };
          }>;
        };
      };
    }>;
  };
}

export const getMonitorProfilesRoute: SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.SYNTHETICS_MONITORS_PROFILES,
  validate: {},
  handler: async ({ request, savedObjectsClient }): Promise<any> => {
    const response = await savedObjectsClient.find<unknown, AggsResponse>({
      type: syntheticsMonitorType,
      perPage: 0,
      aggs: {
        profiles: {
          terms: {
            field: `${monitorAttributes}.${ConfigKey.THROTTLING_CONFIG}.label`,
            size: 1000,
          },
          aggs: {
            doc: {
              top_hits: {
                size: 1,
                _source: [`${syntheticsMonitorType}.${ConfigKey.THROTTLING_CONFIG}`],
              },
            },
          },
        },
      },
    });

    const profiles = response.aggregations?.profiles?.buckets
      .map((bucket) => {
        const { _source } = bucket.doc?.hits?.hits?.[0];
        return _source?.[syntheticsMonitorType]?.[ConfigKey.THROTTLING_CONFIG];
      })
      .filter((profile) => profile) as ThrottlingConfig[];

    return { profiles };
  },
});
