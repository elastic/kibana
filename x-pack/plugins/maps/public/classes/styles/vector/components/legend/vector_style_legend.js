/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiSpacer } from '@elastic/eui';

export function VectorStyleLegend({ isLinesOnly, isPointsOnly, styles, symbolId }) {
  const rows = styles.map(style => {
    return style.renderLegendDetailRow({
      isLinesOnly,
      isPointsOnly,
      symbolId,
    });
  });

  const filtered = rows.filter(row => row !== null);

  return filtered.map((row, index) => {
    const separator = index < filtered.length - 1 ? <EuiSpacer size={'s'} /> : null;

    return (
      <Fragment key={index}>
        {row}
        {separator}
      </Fragment>
    );
  });
}
