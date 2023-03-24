/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { catchError, firstValueFrom, lastValueFrom, map } from 'rxjs';
import { createRouteValidationFunction } from '@kbn/io-ts-utils';
import {
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptionsSerializable,
} from '@kbn/data-plugin/common';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { throwErrors } from '@kbn/cases-plugin/common';
import { estypes } from '@elastic/elasticsearch';
import {
  GetHostsRequestParamsRT,
  GetHostsRequestParams,
  GetHostsResponsePayload,
} from '../../../common/http_api/hosts';
import { InfraBackendLibs } from '../../lib/infra_types';
import { InfraSource } from '../../lib/sources';
import { decodeOrThrow } from '../../../common/runtime_types';
import { HostsSearchResponseRT } from './types';
import { Bucket } from '../../lib/metrics/types';

interface HostsBatchRequest {
  request: {
    id?: string;
    params: GetHostsRequestParams;
  };
  options: ISearchOptionsSerializable;
}

export const convertBucketsToRows = (
  options: GetHostsRequestParams,
  buckets: Bucket[]
): Array<GetHostsResponsePayload['metrics']> => {
  return buckets.map((bucket) => {
    const ids = options.metrics.map((metric) => metric.id);
    const metrics = ids.reduce((acc, id) => {
      const valueObject = get(bucket, [id]);
      return { ...acc, [id]: ValueObjectTypeRT.is(valueObject) ? getValue(valueObject) : null };
    }, {} as Record<string, number | null | object[]>);

    return { timestamp: bucket.key as number, ...metrics };
  });
};

const toApiResponse = (
  aggregations: estypes.SearchResponse<Record<string, unknown>>['aggregations']
): GetHostsResponsePayload => {
  const hostsAggregations = decodeOrThrow(HostsSearchResponseRT)(aggregations);

  return null;
};

const searchHosts = (
  serchClient: ISearchClient,
  source: InfraSource,
  params: GetHostsRequestParams,
  options?: ISearchOptionsSerializable,
  id?: string
) => {
  const query = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: 'now-2d',
                lte: 'now-1d',
              },
            },
          },
          {
            exists: {
              field: 'host.name',
            },
          },
        ],
      },
    },
    runtime_mappings: {
      rx_bytes_per_period: {
        type: 'double',
        script: `
            emit((doc['host.network.ingress.bytes'].value/(doc['metricset.period'].value / 1000)));
          `,
      },
      tx_bytes_per_period: {
        type: 'double',
        script: `
            emit((doc['host.network.egress.bytes'].value/(doc['metricset.period'].value / 1000)));
          `,
      },
      disk_latency: {
        type: 'double',
        script: `
          emit((doc['system.diskio.write.time'].value + doc['system.diskio.read.time'].value) / ((doc['system.diskio.read.count'].value + doc['system.diskio.write.count'].value)));
        `,
      },
      cpu_usage: {
        type: 'double',
        script: `
          emit((doc['system.cpu.user.pct'].value + doc['system.cpu.system.pct'].value) / (doc['system.cpu.cores'].value)); 
        `,
      },
    },
    aggs: {
      groupings: {
        terms: {
          field: 'host.name',
          order: {
            _key: 'asc',
          },
          size: 100,
        },
        aggs: {
          diskLatency: {
            filter: {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'system.diskio.read.time',
                    },
                  },
                  {
                    exists: {
                      field: 'system.diskio.write.time',
                    },
                  },
                  {
                    exists: {
                      field: 'system.diskio.read.count',
                    },
                  },
                  {
                    exists: {
                      field: 'system.diskio.write.count',
                    },
                  },
                ],
              },
            },
            aggs: {
              value: {
                avg: {
                  field: 'disk_latency',
                },
              },
            },
          },
          cpuUsage: {
            filter: {
              bool: {
                must: [
                  {
                    exists: {
                      field: 'system.cpu.user.pct',
                    },
                  },
                  {
                    exists: {
                      field: 'system.cpu.system.pct',
                    },
                  },
                  {
                    exists: {
                      field: 'system.cpu.cores',
                    },
                  },
                ],
              },
            },
            aggs: {
              value: {
                avg: {
                  field: 'cpu_usage',
                },
              },
            },
          },
          rx: {
            filter: {
              exists: {
                field: 'host.network.ingress.bytes',
              },
            },
            aggs: {
              value: {
                avg: {
                  field: 'rx_bytes_per_period',
                },
              },
            },
          },
          tx: {
            filter: {
              exists: {
                field: 'host.network.egress.bytes',
              },
            },
            aggs: {
              value: {
                avg: {
                  field: 'tx_bytes_per_period',
                },
              },
            },
          },
          memoryTotal: {
            avg: {
              field: 'system.memory.total',
            },
          },
          memory: {
            avg: {
              field: 'system.memory.actual.used.pct',
            },
          },
          metadata: {
            top_metrics: {
              metrics: [
                {
                  field: 'host.os.name',
                },
                {
                  field: 'cloud.provider',
                },
              ],
              size: 1,
              sort: {
                '@timestamp': 'desc',
              },
            },
          },
        },
      },
    },
  };

  const { executionContext: ctx, ...restOptions } = options || {};

  return serchClient
    .search<
      { id?: string; params: any },
      { rawResponse: estypes.SearchResponse<Record<string, unknown>> }
    >(
      {
        id,
        params: query,
      },
      restOptions
    )
    .pipe(
      map((res) => {
        return {
          ...res,
          rawResponse: res.rawResponse.aggregations
            ? toApiResponse(res.rawResponse.aggregations)
            : {},
        };
      }),
      catchError((err) => {
        const error = {
          message: err.message,
          statusCode: err.statusCode,
          attributes: err.errBody?.error,
        };

        throw error;
      })
    );
};

export const initHostsRoute = (libs: InfraBackendLibs) => {
  const validateParams = createRouteValidationFunction(GetHostsRequestParamsRT);

  const { framework } = libs;

  const handler = (
    searchClient: ISearchClient,
    source: InfraSource,
    params: GetHostsRequestParams,
    options?: ISearchOptionsSerializable,
    id?: string
  ) => {
    return searchHosts(searchClient, source, params, options, id);
  };

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/hosts',
      validate: {},
    },
    async (context, request, response) => {
      const [{ savedObjects }, { data }] = await libs.getStartServices();
      const params = request.body as any;

      const search = data.search.asScoped(request);
      const soClient = savedObjects.getScopedClient(request);
      const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

      const res = await lastValueFrom(handler(search, source, params));
      return response.ok({
        body: res.rawResponse,
      });
    }
  );

  framework.plugins.bfetch.addBatchProcessingRoute<HostsBatchRequest, IKibanaSearchResponse<any>>(
    '/api/metrics/hosts/batch',
    (request) => {
      return {
        onBatchItem: async ({ request: requestData, options }) => {
          const params = pipe(
            GetHostsRequestParamsRT.decode(requestData.params),
            fold(throwErrors(Boom.badRequest), identity)
          );

          const [{ executionContext, savedObjects }, { data }] = await libs.getStartServices();
          const { id } = requestData;

          const search = data.search.asScoped(request);
          const soClient = savedObjects.getScopedClient(request);
          const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

          const { executionContext: ctx, ...restOptions } = options || {};

          return executionContext.withContext(ctx, async () => {
            return firstValueFrom(handler(search, source, params, restOptions, id));
          });
        },
      };
    }
  );
};
