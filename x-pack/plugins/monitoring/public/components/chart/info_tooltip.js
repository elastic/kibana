/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { first, get } from 'lodash';

export function InfoTooltip({ series }) {

  const bucketSize = get(first(series), 'bucket_size'); // bucket size will be the same for all metrics in all series
  const tableRows = series.map((item, index) => {
    return (
      <tr
        key={`chart-tooltip-${index}`}
        data-debug-metric-agg={item.metric.metricAgg}
        data-debug-metric-field={item.metric.field}
        data-debug-metric-is-derivative={item.metric.isDerivative}
        data-debug-metric-has-calculation={item.metric.hasCalculation}
      >
        <td className="monitoring-chart-tooltip__label">{ item.metric.label }</td>
        <td className="monitoring-chart-tooltip__value">
          { item.metric.description }
        </td>
      </tr>
    );
  });

  return (
    <table className="monitoring-chart-tooltip">
      <tbody>
        <tr>
          <td className="monitoring-chart-tooltip__label">Interval</td>
          <td className="monitoring-chart-tooltip__value">{bucketSize}</td>
        </tr>
        { tableRows }
      </tbody>
    </table>
  );
}
