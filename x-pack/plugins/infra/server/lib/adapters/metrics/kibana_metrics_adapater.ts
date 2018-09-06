/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import moment from 'moment';
import { InfraMetric, InfraMetricData, InfraNodeType } from '../../../../common/graphql/types';
import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { InfraMetricsAdapter, InfraMetricsRequestOptions } from './adapter_types';
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
      [InfraNodeType.host]: options.sourceConfiguration.fields.hostname,
      [InfraNodeType.container]: options.sourceConfiguration.fields.container,
      [InfraNodeType.pod]: options.sourceConfiguration.fields.pod,
    };
    const indexPattern = options.sourceConfiguration.metricAlias;
    const timeField = options.sourceConfiguration.fields.timestamp;
    const interval = options.timerange.interval;
    const nodeField = fields[options.nodeType];
    const timerange = {
      min: moment.utc(options.timerange.from).toISOString(),
      max: moment.utc(options.timerange.to).toISOString(),
    };
    const requests = options.metrics.map(metricId => {
      const model = metricModels[metricId](timeField, indexPattern, interval);
      const filters = [{ match: { [nodeField]: options.nodeId } }];
      return this.framework.makeTSVBRequest(req, model, timerange, filters);
    });
    return Promise.all(requests)
      .then(results => {
        return results.map(result => {
          const metricIds = Object.keys(result).filter(k => k !== 'type');
          return metricIds.map((id: string) => {
            const infraMetricId: InfraMetric = (InfraMetric as any)[id];
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
