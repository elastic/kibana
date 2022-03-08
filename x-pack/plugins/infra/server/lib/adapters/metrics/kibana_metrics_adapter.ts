/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaRequest } from 'src/core/server';
import { flatten, get } from 'lodash';
import { TIMESTAMP_FIELD } from '../../../../common/constants';
import { NodeDetailsMetricData } from '../../../../common/http_api/node_details_api';
import { KibanaFramework } from '../framework/kibana_framework_adapter';
import { InfraMetricsAdapter, InfraMetricsRequestOptions } from './adapter_types';
import { checkValidNode } from './lib/check_valid_node';
import { metrics, findInventoryFields } from '../../../../common/inventory_models';
import {
  TSVBMetricModelCreator,
  InventoryMetric,
  InventoryMetricRT,
} from '../../../../common/inventory_models/types';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';
import { CallWithRequestParams, InfraDatabaseSearchResponse } from '../framework';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { isVisSeriesData } from '../../../../../../../src/plugins/vis_types/timeseries/server';

export class KibanaMetricsAdapter implements InfraMetricsAdapter {
  private framework: KibanaFramework;

  constructor(framework: KibanaFramework) {
    this.framework = framework;
  }

  public async getMetrics(
    requestContext: InfraPluginRequestHandlerContext,
    options: InfraMetricsRequestOptions,
    rawRequest: KibanaRequest
  ): Promise<NodeDetailsMetricData[]> {
    const indexPattern = `${options.sourceConfiguration.metricAlias}`;
    const fields = findInventoryFields(options.nodeType);
    const nodeField = fields.id;

    const search = <Aggregation>(searchOptions: object) =>
      this.framework.callWithRequest<{}, Aggregation>(requestContext, 'search', searchOptions);

    const validNode = await checkValidNode(search, indexPattern, nodeField, options.nodeIds.nodeId);
    if (!validNode) {
      throw new Error(
        i18n.translate('xpack.infra.kibanaMetrics.nodeDoesNotExistErrorMessage', {
          defaultMessage: '{nodeId} does not exist.',
          values: {
            nodeId: options.nodeIds.nodeId,
          },
        })
      );
    }

    const requests = options.metrics.map((metricId) =>
      this.makeTSVBRequest(metricId, options, nodeField, requestContext, rawRequest)
    );

    return Promise.all(requests)
      .then((results) => {
        return results.filter(isVisSeriesData).map((result) => {
          const metricIds = Object.keys(result).filter(
            (k) => !['type', 'uiRestrictions', 'trackedEsSearches'].includes(k)
          );

          return metricIds.map((id: string) => {
            if (!InventoryMetricRT.is(id)) {
              throw new Error(
                i18n.translate('xpack.infra.kibanaMetrics.invalidInfraMetricErrorMessage', {
                  defaultMessage: '{id} is not a valid InfraMetric',
                  values: {
                    id,
                  },
                })
              );
            }
            const panel = result[id];
            return {
              id,
              series: panel.series.map((series) => {
                return {
                  id: series.id,
                  // In case of grouping by multiple fields, "series.label" is array.
                  // If infra will perform this type of grouping, the following code needs to be updated
                  label: [series.label].flat()[0],
                  data: series.data.map((point) => ({
                    timestamp: point[0] as number,
                    value: point[1] as number | null,
                  })),
                };
              }),
            };
          });
        });
      })
      .then((result) => flatten(result));
  }

  async makeTSVBRequest(
    metricId: InventoryMetric,
    options: InfraMetricsRequestOptions,
    nodeField: string,
    requestContext: InfraPluginRequestHandlerContext,
    rawRequest: KibanaRequest
  ) {
    const createTSVBModel = get(metrics, ['tsvb', metricId]) as TSVBMetricModelCreator | undefined;
    if (!createTSVBModel) {
      throw new Error(
        i18n.translate('xpack.infra.metrics.missingTSVBModelError', {
          defaultMessage: 'The TSVB model for {metricId} does not exist for {nodeType}',
          values: {
            metricId,
            nodeType: options.nodeType,
          },
        })
      );
    }

    const indexPattern = `${options.sourceConfiguration.metricAlias}`;
    const timerange = {
      min: options.timerange.from,
      max: options.timerange.to,
    };

    const model = createTSVBModel(TIMESTAMP_FIELD, indexPattern, options.timerange.interval);

    const client = <Hit = {}, Aggregation = undefined>(
      opts: CallWithRequestParams
    ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> =>
      this.framework.callWithRequest(requestContext, 'search', opts);

    const calculatedInterval = await calculateMetricInterval(
      client,
      {
        indexPattern: `${options.sourceConfiguration.metricAlias}`,
        timerange: options.timerange,
      },
      model.requires
    );

    if (calculatedInterval) {
      model.interval = `>=${calculatedInterval}s`;
    }

    if (model.id_type === 'cloud' && !options.nodeIds.cloudId) {
      throw new Error(
        i18n.translate('xpack.infra.kibanaMetrics.cloudIdMissingErrorMessage', {
          defaultMessage:
            'Model for {metricId} requires a cloudId, but none was given for {nodeId}.',
          values: {
            metricId,
            nodeId: options.nodeIds.nodeId,
          },
        })
      );
    }
    const id =
      model.id_type === 'cloud' ? (options.nodeIds.cloudId as string) : options.nodeIds.nodeId;
    const filters = model.map_field_to
      ? [{ match: { [model.map_field_to]: id } }]
      : [{ match: { [nodeField]: id } }];

    return this.framework.makeTSVBRequest(requestContext, rawRequest, model, timerange, filters);
  }
}
