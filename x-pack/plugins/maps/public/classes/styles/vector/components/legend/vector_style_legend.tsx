/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Mask } from '../../../../layers/vector_layer/mask';
import { IStyleProperty } from '../../properties/style_property';
import { MaskLegend } from './mask_legend';

interface Props {
  isLinesOnly: boolean;
  isPointsOnly: boolean;
  masks: Mask[];
  styles: Array<IStyleProperty<any>>;
  symbolId?: string;
  svg?: string;
}

export function VectorStyleLegend({
  isLinesOnly,
  isPointsOnly,
  masks,
  styles,
  symbolId,
  svg,
}: Props) {
  const legendRows = [];

  for (let i = 0; i < styles.length; i++) {
    const row = styles[i].renderLegendDetailRow({
      isLinesOnly,
      isPointsOnly,
      symbolId,
      svg,
    });

    legendRows.push(
      <div key={i} className="vectorStyleLegendSpacer">
        {row}
      </div>
    );
  }

  const masksLegend = masks.length ? (
    <>
      {masks.map((mask) => (
        <MaskLegend
          key={mask.getEsAggField().getMbFieldName()}
          esAggField={mask.getEsAggField()}
          operator={mask.getOperator()}
          value={mask.getValue()}
        />
      ))}
    </>
  ) : null;

  return (
    <>
      {masksLegend}
      {legendRows}
    </>
  );
}
