/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { flatten } from 'lodash';

import { InfraMetric, InfraMetricData, InfraNodeType } from '../../../graphql/types';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { InfraMetricsAdapter, InfraMetricsRequestOptions } from './adapter_types';
import { checkValidNode } from './lib/check_valid_node';
import { InvalidNodeError } from './lib/errors';
import { metricModels } from './models';

export class KibanaMetricsAdapter implements InfraMetricsAdapter {
  private framework: InfraBackendFrameworkAdapter;

  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getMetrics(
    req: InfraFrameworkRequest,
    options: InfraMetricsRequestOptions
  ): Promise<InfraMetricData[]> {
    const fields = {
      [InfraNodeType.host]: options.sourceConfiguration.fields.host,
      [InfraNodeType.container]: options.sourceConfiguration.fields.container,
      [InfraNodeType.pod]: options.sourceConfiguration.fields.pod,
    };
    const indexPattern = `${options.sourceConfiguration.metricAlias},${
      options.sourceConfiguration.logAlias
    }`;
    const timeField = options.sourceConfiguration.fields.timestamp;
    const interval = options.timerange.interval;
    const nodeField = fields[options.nodeType];
    const timerange = {
      min: options.timerange.from,
      max: options.timerange.to,
    };

    const search = <Aggregation>(searchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(req, 'search', searchOptions);

    const validNode = await checkValidNode(search, indexPattern, nodeField, options.nodeId);
    if (!validNode) {
      throw new InvalidNodeError(
        i18n.translate('xpack.infra.kibanaMetrics.nodeDoesNotExistErrorMessage', {
          defaultMessage: '{nodeId} does not exist.',
          values: {
            nodeId: options.nodeId,
          },
        })
      );
    }

    const requests = options.metrics.map(metricId => {
      const model = metricModels[metricId](timeField, indexPattern, interval);
      const filters = [{ match: { [nodeField]: options.nodeId } }];
      return this.framework.makeTSVBRequest(req, model, timerange, filters);
    });
    return Promise.all(requests)
      .then(results => {
        return results.map(result => {
          const metricIds = Object.keys(result).filter(
            k => !['type', 'uiRestrictions'].includes(k)
          );

          return metricIds.map((id: string) => {
            const infraMetricId: InfraMetric = (InfraMetric as any)[id];
            if (!infraMetricId) {
              throw new Error(
                i18n.translate('xpack.infra.kibanaMetrics.invalidInfraMetricErrorMessage', {
                  defaultMessage: '{id} is not a valid InfraMetric',
                  values: {
                    id,
                  },
                })
              );
            }
            const panel = result[infraMetricId];
            return {
              id: infraMetricId,
              series: panel.series.map(series => {
                return {
                  id: series.id,
                  data: series.data.map(point => ({ timestamp: point[0], value: point[1] })),
                };
              }),
            };
          });
        });
      })
      .then(result => flatten(result));
  }
}
