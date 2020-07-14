/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { union, uniq, isArray, isString } from 'lodash';
import { KibanaRequest, RequestHandlerContext } from 'src/core/server';
import { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import {
  MetricsExplorerRow,
  MetricsExplorerSeries,
  MetricsExplorerRequestBody,
  MetricsExplorerColumn,
} from '../../../../common/http_api/metrics_explorer';
import { createMetricModel } from './create_metrics_model';
import { JsonObject } from '../../../../common/typed_json';
import { calculateMetricInterval } from '../../../utils/calculate_metric_interval';
import { getDatasetForField } from './get_dataset_for_field';
import {
  CallWithRequestParams,
  InfraDatabaseSearchResponse,
} from '../../../lib/adapters/framework';

export const populateSeriesWithTSVBData = (
  request: KibanaRequest,
  options: MetricsExplorerRequestBody,
  framework: KibanaFramework,
  requestContext: RequestHandlerContext
) => async (series: MetricsExplorerSeries) => {
  // IF there are no metrics selected then we should return an empty result.
  if (options.metrics.length === 0) {
    return {
      ...series,
      columns: [],
      rows: [],
    };
  }

  // Set the filter for the group by or match everything
  const isGroupBySet =
    Array.isArray(options.groupBy) && options.groupBy.length
      ? true
      : isString(options.groupBy)
      ? true
      : false;

  const filters: JsonObject[] = isGroupBySet
    ? isArray(options.groupBy)
      ? options.groupBy
          .filter((f) => f)
          .map((field, index) => ({ match: { [field as string]: series.keys?.[index] || '' } }))
      : [{ match: { [options.groupBy as string]: series.id } }]
    : [];

  if (options.filterQuery) {
    try {
      const filterQuery = JSON.parse(options.filterQuery);
      filters.push(filterQuery);
    } catch (error) {
      filters.push({
        query_string: {
          query: options.filterQuery,
          analyze_wildcard: true,
        },
      });
    }
  }
  const timerange = { min: options.timerange.from, max: options.timerange.to };

  const client = <Hit = {}, Aggregation = undefined>(
    opts: CallWithRequestParams
  ): Promise<InfraDatabaseSearchResponse<Hit, Aggregation>> =>
    framework.callWithRequest(requestContext, 'search', opts);

  // Create the TSVB model based on the request options
  const model = createMetricModel(options);
  const modules = await Promise.all(
    uniq(options.metrics.filter((m) => m.field)).map(
      async (m) => await getDatasetForField(client, m.field as string, options.indexPattern)
    )
  );

  const calculatedInterval = await calculateMetricInterval(
    client,
    {
      indexPattern: options.indexPattern,
      timestampField: options.timerange.field,
      timerange: options.timerange,
    },
    modules.filter((m) => m) as string[]
  );

  if (calculatedInterval) {
    model.interval = options.forceInterval
      ? options.timerange.interval
      : `>=${calculatedInterval}s`;
  }

  // Get TSVB results using the model, timerange and filters
  const tsvbResults = await framework.makeTSVBRequest(
    requestContext,
    request,
    model,
    timerange,
    filters
  );

  // If there is no data `custom` will not exist.
  if (!tsvbResults.custom) {
    return {
      ...series,
      columns: [],
      rows: [],
    };
  }

  // Setup the dynamic columns and row attributes depending on if the user is doing a group by
  // and multiple metrics
  const attributeColumns: MetricsExplorerColumn[] =
    options.groupBy != null ? [{ name: 'groupBy', type: 'string' }] : [];
  const metricColumns: MetricsExplorerColumn[] = options.metrics.map((m, i) => ({
    name: `metric_${i}`,
    type: 'number',
  }));
  const rowAttributes = options.groupBy != null ? { groupBy: series.id } : {};

  // To support multiple metrics, there are multiple TSVB series which need to be combined
  // into one MetricExplorerRow (Canvas row). This is done by collecting all the timestamps
  // across each TSVB series. Then for each timestamp we find the values and create a
  // MetricsExplorerRow.
  const timestamps = tsvbResults.custom.series.reduce(
    (currentTimestamps, tsvbSeries) =>
      union(
        currentTimestamps,
        tsvbSeries.data.map((row) => row[0])
      ).sort(),
    [] as number[]
  );
  // Combine the TSVB series for multiple metrics.
  const rows = timestamps.map((timestamp) => {
    return tsvbResults.custom.series.reduce(
      (currentRow, tsvbSeries) => {
        const matches = tsvbSeries.data.find((d) => d[0] === timestamp);
        if (matches) {
          return { ...currentRow, [tsvbSeries.id]: matches[1] };
        }
        return currentRow;
      },
      { timestamp, ...rowAttributes } as MetricsExplorerRow
    );
  });
  return {
    ...series,
    rows,
    columns: [
      { name: 'timestamp', type: 'date' } as MetricsExplorerColumn,
      ...metricColumns,
      ...attributeColumns,
    ],
  };
};
