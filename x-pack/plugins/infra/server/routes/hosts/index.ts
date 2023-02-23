/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, firstValueFrom, lastValueFrom, map } from 'rxjs';

import {
  IKibanaSearchResponse,
  ISearchClient,
  ISearchOptionsSerializable,
} from '@kbn/data-plugin/common';

import { schema } from '@kbn/config-schema';
import { MetricsAPIRequest, SnapshotNodeResponse, SnapshotRequest } from '../../../common/http_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { transformSnapshotMetricsToMetricsAPIMetrics } from '../snapshot/lib/transform_snapshot_metrics_to_metrics_api_metrics';
import { transformMetricsApiResponseToSnapshotResponse } from '../snapshot/lib/transform_metrics_ui_response';
import { getQuery, convertResponse } from '../../lib/metrics';
import { MetricsESResponse } from '../../lib/metrics/types';
import { InfraDatabaseSearchResponse } from '../../lib/adapters/framework';
import { InfraSource } from '../../lib/sources';

const escapeHatch = schema.object({}, { unknowns: 'allow' });

interface HostsRequest {
  request: {
    id?: string;
    params: SnapshotRequest;
  };
  options: ISearchOptionsSerializable;
}

const searchHosts = (
  serchClient: ISearchClient,
  source: InfraSource,
  params: SnapshotRequest,
  options?: ISearchOptionsSerializable,
  id?: string
) => {
  const metricsApiRequest: MetricsAPIRequest = {
    indexPattern: source.configuration.metricAlias,
    timerange: {
      ...params.timerange,
    },
    metrics: transformSnapshotMetricsToMetricsAPIMetrics(params),
    limit: 2000,
    alignDataToEnd: true,
    dropPartialBuckets: true,
    includeTimeseries: params.includeTimeseries,
  };

  if (params.groupBy) {
    const groupBy = params.groupBy.map((g) => g.field).filter(Boolean) as string[];
    metricsApiRequest.groupBy = [...groupBy, 'host.name'];
  }

  const query = getQuery(metricsApiRequest, true, true);

  const { executionContext: ctx, ...restOptions } = options || {};

  return serchClient
    .search<
      { id?: string; params: any },
      { rawResponse: InfraDatabaseSearchResponse<{}, MetricsESResponse> }
    >(
      {
        id,
        params: query,
      },
      restOptions
    )
    .pipe(
      map((res) => {
        const toApiResponse = () => {
          const response = convertResponse(res.rawResponse, metricsApiRequest, true, '1m', true);

          return transformMetricsApiResponseToSnapshotResponse(metricsApiRequest, params, response);
        };

        return {
          ...res,
          rawResponse: res.rawResponse.aggregations
            ? toApiResponse()
            : {
                interval: '',
                nodes: [],
              },
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
  const { framework } = libs;

  const handler = (
    searchClient: ISearchClient,
    source: InfraSource,
    params: SnapshotRequest,
    options?: ISearchOptionsSerializable,
    id?: string
  ) => {
    return searchHosts(searchClient, source, params, options, id);
  };

  framework.registerRoute(
    {
      method: 'post',
      path: '/api/metrics/hosts',
      validate: {
        body: escapeHatch,
      },
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

  framework.plugins.bfetch.addBatchProcessingRoute<
    HostsRequest,
    IKibanaSearchResponse<SnapshotNodeResponse>
  >('/api/metrics/hosts/batch', (request) => {
    return {
      onBatchItem: async ({ request: requestData, options }) => {
        const [{ executionContext, savedObjects }, { data }] = await libs.getStartServices();
        const { id, params } = requestData;

        const search = data.search.asScoped(request);
        const soClient = savedObjects.getScopedClient(request);
        const source = await libs.sources.getSourceConfiguration(soClient, params.sourceId);

        const { executionContext: ctx, ...restOptions } = options || {};

        return executionContext.withContext(ctx, async () => {
          return firstValueFrom(handler(search, source, params, restOptions, id));
        });
      },
    };
  });
};

//   const { framework } = libs;

//   return framework.plugins.bfetch.addStreamingResponseRoute<
//     {
//       request: SnapshotRequest;
//       options: ISearchOptionsSerializable;
//     },
//     unknown
//   >('/api/metrics/hosts', (request, _context) => {
//     const abortSignal = getRequestAbortedSignal(request.events.aborted$);

//     return {
//       getResponseStream: ({ request: requestData, options }) => {
//         const subject = new Subject<SnapshotNodeResponse>();
//         const searchHosts = async () => {
//           const [{ savedObjects, executionContext }, { data }] = await libs.getStartServices();

//           const search = data.search.asScoped(request);
//           const soClient = savedObjects.getScopedClient(request);
//           const source = await libs.sources.getSourceConfiguration(soClient, requestData.sourceId);

//           const metricsApiRequest: MetricsAPIRequest = {
//             indexPattern: source.configuration.metricAlias,
//             timerange: {
//               ...requestData.timerange,
//             },
//             metrics: transformSnapshotMetricsToMetricsAPIMetrics(requestData),
//             limit: 2000,
//             alignDataToEnd: true,
//             dropPartialBuckets: true,
//             includeTimeseries: requestData.includeTimeseries,
//           };

//           if (requestData.groupBy) {
//             const groupBy = requestData.groupBy.map((g) => g.field).filter(Boolean) as string[];
//             metricsApiRequest.groupBy = [...groupBy, 'host.name'];
//           }

//           const query = getQuery(metricsApiRequest, true, true);

//           const { executionContext: ctx, ...restOptions } = options || {};
//           return executionContext.withContext(ctx, () => {
//             return search
//               .search<
//                 { params: any },
//                 { rawResponse: InfraDatabaseSearchResponse<{}, MetricsESResponse> }
//               >(
//                 {
//                   params: query,
//                 },
//                 { ...restOptions, abortSignal }
//               )
//               .subscribe({
//                 next(res) {
//                   if (res.rawResponse.aggregations) {
//                     const response = convertResponse(
//                       res.rawResponse,
//                       metricsApiRequest,
//                       true,
//                       '1m',
//                       true
//                     );
//                     return subject.next(
//                       transformMetricsApiResponseToSnapshotResponse(
//                         metricsApiRequest,
//                         requestData,
//                         response
//                       )
//                     );
//                   }
//                 },
//                 complete() {
//                   subject.complete();
//                 },
//                 error(err) {
//                   const error = {
//                     message: err.message,
//                     statusCode: err.statusCode,
//                     attributes: err.errBody?.error,
//                   };

//                   subject.error(error);
//                 },
//               });
//           });
//         };

//         searchHosts();

//         return subject;
//       },
//     };
//   });
// };
