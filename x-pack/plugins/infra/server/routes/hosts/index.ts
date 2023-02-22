/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Subject } from 'rxjs';

import { ISearchOptionsSerializable } from '@kbn/data-plugin/common';

import { MetricsAPIRequest, SnapshotNodeResponse, SnapshotRequest } from '../../../common/http_api';
import { InfraBackendLibs } from '../../lib/infra_types';
import { transformSnapshotMetricsToMetricsAPIMetrics } from '../snapshot/lib/transform_snapshot_metrics_to_metrics_api_metrics';
import { transformMetricsApiResponseToSnapshotResponse } from '../snapshot/lib/transform_metrics_ui_response';
import { getQuery, convertResponse } from '../../lib/metrics';
import { MetricsESResponse } from '../../lib/metrics/types';
import { InfraDatabaseSearchResponse } from '../../lib/adapters/framework';

export const initHostsRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  return framework.plugins.bfetch.addStreamingResponseRoute<
    {
      request: SnapshotRequest;
      options: ISearchOptionsSerializable;
    },
    unknown
  >('/api/metrics/hosts', (request, _context) => {
    return {
      getResponseStream: ({ request: requestData, options }) => {
        const subject = new Subject<SnapshotNodeResponse>();
        const test = async () => {
          const [{ savedObjects, executionContext }, { data }] = await libs.getStartServices();

          const search = data.search.asScoped(request);
          const soClient = savedObjects.getScopedClient(request);
          const source = await libs.sources.getSourceConfiguration(soClient, requestData.sourceId);

          const metricsApiRequest: MetricsAPIRequest = {
            indexPattern: source.configuration.metricAlias,
            timerange: {
              ...requestData.timerange,
            },
            metrics: transformSnapshotMetricsToMetricsAPIMetrics(requestData),
            limit: 2000,
            alignDataToEnd: true,
            dropPartialBuckets: true,
            includeTimeseries: requestData.includeTimeseries,
          };

          if (requestData.groupBy) {
            const groupBy = requestData.groupBy.map((g) => g.field).filter(Boolean) as string[];
            metricsApiRequest.groupBy = [...groupBy, 'host.name'];
          }

          const query = getQuery(metricsApiRequest, true, true);

          const { executionContext: ctx, ...restOptions } = options || {};
          return executionContext.withContext(ctx, () => {
            search
              .search<
                { params: any },
                { rawResponse: InfraDatabaseSearchResponse<{}, MetricsESResponse> }
              >(
                {
                  params: query,
                },
                restOptions
              )
              .subscribe({
                next(res) {
                  if (res.rawResponse.aggregations) {
                    const a = convertResponse(res.rawResponse, metricsApiRequest, true, '1m', true);
                    return subject.next(
                      transformMetricsApiResponseToSnapshotResponse(
                        metricsApiRequest,
                        requestData,
                        a
                      )
                    );
                  }
                },
                complete() {
                  subject.complete();
                },
                error(err) {
                  const error = {
                    message: err.message,
                    statusCode: err.statusCode,
                    attributes: err.errBody?.error,
                  };

                  subject.error(error);
                },
              });
          });
        };

        test();

        return subject;
      },
    };
  });
};
