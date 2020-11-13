/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsAPISeries, MetricsExplorerSeries } from '../../../../common/http_api';

export const transformSeries = (hasGroupBy: boolean) => (
  series: MetricsAPISeries
): MetricsExplorerSeries => {
  const id = series.keys?.join(' / ') ?? series.id;
  return {
    ...series,
    id,
    rows: series.rows.map((row) => {
      if (hasGroupBy) {
        return { ...row, groupBy: id };
      }
      return row;
    }),
    columns: hasGroupBy ? [...series.columns, { name: 'groupBy', type: 'string' }] : series.columns,
  };
};
