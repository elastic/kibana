/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IStyleProperty } from '../../properties/style_property';

interface Props {
  isLinesOnly: boolean;
  isPointsOnly: boolean;
  styles: Array<IStyleProperty<any>>;
  symbolId?: string;
}

export function VectorStyleLegend({ isLinesOnly, isPointsOnly, styles, symbolId }: Props) {
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

  return <>{legendRows}</>;
}
