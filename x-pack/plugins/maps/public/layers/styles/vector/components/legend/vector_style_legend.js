/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';

export function VectorStyleLegend({ isLinesOnly, isPointsOnly, styles, symbolId }) {
  return styles.map(style => {
    return (
      <Fragment key={style.getStyleName()}>
        {style.renderLegendDetailRow({
          isLinesOnly,
          isPointsOnly,
          symbolId,
        })}
      </Fragment>
    );
  });
}
