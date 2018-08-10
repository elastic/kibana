/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function InfoTooltip({ series, bucketSize }) {
  const tableRows = series.map((item, index) => {
    return (
      <tr
        key={`chart-tooltip-${index}`}
        data-debug-metric-agg={item.metric.metricAgg}
        data-debug-metric-field={item.metric.field}
        data-debug-metric-is-derivative={item.metric.isDerivative}
        data-debug-metric-has-calculation={item.metric.hasCalculation}
      >
        <td className="monChart__tooltipLabel">{ item.metric.label }</td>
        <td className="monChart__tooltipValue">
          { item.metric.description }
        </td>
      </tr>
    );
  });

  return (
    <table>
      <tbody>
        <tr>
          <td className="monChart__tooltipLabel">Interval</td>
          <td className="monChart__tooltipValue">{bucketSize}</td>
        </tr>
        { tableRows }
      </tbody>
    </table>
  );
}
