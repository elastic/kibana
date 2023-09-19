/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiToolTip } from '@elastic/eui';
import styled from 'styled-components';

const ColoredSpan = styled.div`
  height: 16px;
  width: 100%;
  cursor: pointer;
`;

const getSpanStyle = (position: number, inFocus: boolean, hexCode: string, percentage: number) => {
  let first = position === 0 || percentage === 100;
  let last = position === 2 || percentage === 100;
  if (percentage === 100) {
    first = true;
    last = true;
  }

  const spanStyle: any = {
    backgroundColor: hexCode,
    opacity: !inFocus ? 1 : 0.3,
  };
  let borderRadius = '';

  if (first) {
    borderRadius = '4px 0 0 4px';
  }
  if (last) {
    borderRadius = '0 4px 4px 0';
  }
  if (first && last) {
    borderRadius = '4px';
  }
  spanStyle.borderRadius = borderRadius;

  return spanStyle;
};

export function ColorPaletteFlexItem({
  hexCode,
  inFocus,
  percentage,
  tooltip,
  position,
}: {
  hexCode: string;
  position: number;
  inFocus: boolean;
  percentage: number;
  tooltip: string;
}) {
  const spanStyle = getSpanStyle(position, inFocus, hexCode, percentage);

  return (
    <EuiFlexItem key={hexCode} grow={false} style={{ width: percentage + '%' }}>
      <EuiToolTip content={tooltip}>
        <ColoredSpan style={spanStyle} />
      </EuiToolTip>
    </EuiFlexItem>
  );
}
