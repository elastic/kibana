/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IconStaticOptions } from '../../../../../../common/descriptor_types';
import { IStyleProperty } from '../../properties/style_property';

interface Props {
  isLinesOnly: boolean;
  isPointsOnly: boolean;
  styles: Array<IStyleProperty<any>>;
  icon?: IconStaticOptions;
}

export function VectorStyleLegend({ isLinesOnly, isPointsOnly, styles, icon }: Props) {
  const legendRows = [];

  for (let i = 0; i < styles.length; i++) {
    const row = styles[i].renderLegendDetailRow({
      isLinesOnly,
      isPointsOnly,
      icon,
    });

    legendRows.push(
      <div key={i} className="vectorStyleLegendSpacer">
        {row}
      </div>
    );
  }

  return <>{legendRows}</>;
}
