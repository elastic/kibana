/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { VECTOR_STYLES } from '../../../../../../common/constants';
import { VectorIcon } from './vector_icon';

interface Props {
  styleName: VECTOR_STYLES;
  label: ReactElement<any> | string | number;
  color: string;
  isLinesOnly: boolean;
  isPointsOnly: boolean;
  symbolId?: string;
  svg?: string;
}

export function Category({
  styleName,
  label,
  color,
  isLinesOnly,
  isPointsOnly,
  symbolId,
  svg,
}: Props) {
  function renderIcon() {
    if (styleName === VECTOR_STYLES.LABEL_COLOR) {
      return (
        <EuiText size="xs" style={{ color }}>
          Tx
        </EuiText>
      );
    }

    return (
      <VectorIcon
        fillColor={styleName === VECTOR_STYLES.FILL_COLOR ? color : 'none'}
        isPointsOnly={isPointsOnly}
        isLinesOnly={isLinesOnly}
        strokeColor={color}
        symbolId={symbolId}
        svg={svg}
      />
    );
  }

  return (
    <EuiFlexGroup direction="row" gutterSize="none">
      <EuiFlexItem className="mapLegendIconPreview" grow={false}>
        {renderIcon()}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs">{label}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
