/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { FIELD_ORIGIN } from '../../../../../../common/constants';
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

  function renderMasksByFieldOrigin(fieldOrigin: FIELD_ORIGIN) {
    const masksByFieldOrigin = masks.filter(
      (mask) => mask.getEsAggField().getOrigin() === fieldOrigin
    );
    if (masksByFieldOrigin.length === 0) {
      return null;
    }

    if (masksByFieldOrigin.length === 1) {
      const mask = masksByFieldOrigin[0];
      return (
        <MaskLegend
          key={mask.getEsAggField().getMbFieldName()}
          esAggField={mask.getEsAggField()}
          operator={mask.getOperator()}
          value={mask.getValue()}
        />
      );
    }

    return (
      <>
        <EuiText size="xs" textAlign="left" color="subdued">
          <small>{masksByFieldOrigin[0].getFieldOriginListLabel()}</small>
        </EuiText>
        <ul>
          {masksByFieldOrigin.map((mask) => (
            <li
              key={mask.getEsAggField().getMbFieldName()}
              style={{ marginLeft: euiThemeVars.euiSizeS }}
            >
              <MaskLegend
                esAggField={mask.getEsAggField()}
                onlyShowLabelAndValue={true}
                operator={mask.getOperator()}
                value={mask.getValue()}
              />
            </li>
          ))}
        </ul>
      </>
    );
  }

  return (
    <>
      {renderMasksByFieldOrigin(FIELD_ORIGIN.SOURCE)}
      {renderMasksByFieldOrigin(FIELD_ORIGIN.JOIN)}
      {legendRows}
    </>
  );
}
