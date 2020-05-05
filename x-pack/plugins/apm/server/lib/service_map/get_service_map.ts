/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { chunk } from 'lodash';
import {
  AGENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_NAME
} from '../../../common/elasticsearch_fieldnames';
import { getServicesProjection } from '../../../common/projections/services';
import { mergeProjection } from '../../../common/projections/util/merge_projection';
import { PromiseReturnType } from '../../../typings/common';
import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { dedupeConnections } from './dedupe_connections';
import { getServiceMapFromTraceIds } from './get_service_map_from_trace_ids';
import { getTraceSampleIds } from './get_trace_sample_ids';
import { addAnomaliesToServicesData } from './ml_helpers';
import { getMlIndex } from '../../../common/ml_job_constants';

export interface IEnvOptions {
  setup: Setup & SetupTimeRange;
  serviceName?: string;
  environment?: string;
}

async function getConnectionData({
  setup,
  serviceName,
  environment
}: IEnvOptions) {
  const { traceIds } = await getTraceSampleIds({
    setup,
    serviceName,
    environment
  });

  const chunks = chunk(
    traceIds,
    setup.config['xpack.apm.serviceMapMaxTracesPerRequest']
  );

  const init = {
    connections: [],
    discoveredServices: []
  };

  if (!traceIds.length) {
    return init;
  }

  const chunkedResponses = await Promise.all(
    chunks.map(traceIdsChunk =>
      getServiceMapFromTraceIds({
        setup,
        serviceName,
        environment,
        traceIds: traceIdsChunk
      })
    )
  );

  return chunkedResponses.reduce((prev, current) => {
    return {
      connections: prev.connections.concat(current.connections),
      discoveredServices: prev.discoveredServices.concat(
        current.discoveredServices
      )
    };
  });
}

async function getServicesData(options: IEnvOptions) {
  const { setup } = options;

  const projection = getServicesProjection({
    setup: { ...setup, uiFiltersES: [] }
  });

  const { filter } = projection.body.query.bool;

  const params = mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          ...projection.body.query.bool,
          filter: options.serviceName
            ? filter.concat({
                term: {
                  [SERVICE_NAME]: options.serviceName
                }
              })
            : filter
        }
      },
      aggs: {
        services: {
          terms: {
            field: projection.body.aggs.services.terms.field,
            size: 500
          },
          aggs: {
            agent_name: {
              terms: {
                field: AGENT_NAME
              }
            },
            service_framework_name: {
              terms: {
                field: SERVICE_FRAMEWORK_NAME
              }
            }
          }
        }
      }
    }
  });

  const { client } = setup;

  const response = await client.search(params);

  return (
    response.aggregations?.services.buckets.map(bucket => {
      return {
        [SERVICE_NAME]: bucket.key as string,
        [AGENT_NAME]:
          (bucket.agent_name.buckets[0]?.key as string | undefined) || '',
        [SERVICE_ENVIRONMENT]: options.environment || null,
        [SERVICE_FRAMEWORK_NAME]:
          (bucket.service_framework_name.buckets[0]?.key as
            | string
            | undefined) || null
      };
    }) || []
  );
}

function getAnomaliesData(options: IEnvOptions) {
  const { client } = options.setup;

  const params = {
    index: getMlIndex('*'),
    body: {
      size: 0,
      query: {
        exists: {
          field: 'bucket_span'
        }
      },
      aggs: {
        jobs: {
          terms: {
            field: 'job_id',
            size: 10
          },
          aggs: {
            max_score: {
              max: {
                field: 'anomaly_score'
              }
            }
          }
        }
      }
    }
  };

  return client.search(params);
}

export type AnomaliesResponse = PromiseReturnType<typeof getAnomaliesData>;
export type ConnectionsResponse = PromiseReturnType<typeof getConnectionData>;
export type ServicesResponse = PromiseReturnType<typeof getServicesData>;
export type ServiceMapAPIResponse = PromiseReturnType<typeof getServiceMap>;

export async function getServiceMap(options: IEnvOptions) {
  const [connectionData, servicesData, anomaliesData] = await Promise.all([
    getConnectionData(options),
    getServicesData(options),
    getAnomaliesData(options)
  ]);

  const servicesDataWithAnomalies = addAnomaliesToServicesData(
    servicesData,
    anomaliesData
  );

  return dedupeConnections({
    ...connectionData,
    services: servicesDataWithAnomalies
  });
}
