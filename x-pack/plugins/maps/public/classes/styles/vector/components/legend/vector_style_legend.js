/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export function VectorStyleLegend({ isLinesOnly, isPointsOnly, styles, symbolId }) {
  const legendRows = [];

  for (let i = 0; i < styles.length; i++) {
    const row = styles[i].renderLegendDetailRow({
      isLinesOnly,
      isPointsOnly,
      symbolId,
    });

    legendRows.push(
      <div key={i} className="vectorStyleLegendSpacer">
        {row}
      </div>
    );
  }

  return legendRows;
}
