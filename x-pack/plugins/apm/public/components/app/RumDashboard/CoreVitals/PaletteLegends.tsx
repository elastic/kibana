/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  euiPaletteForStatus,
} from '@elastic/eui';
import styled from 'styled-components';

const PaletteLegend = styled(EuiHealth)`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
    background-color: #e7f0f7;
  }
`;

interface Props {
  ranks: number[];
}

export const PaletteLegends = ({ ranks, onItemHover }: Props) => {
  const palette = euiPaletteForStatus(3);

  return (
    <EuiFlexGroup>
      {palette.map((color, ind) => (
        <EuiFlexItem
          key={ind}
          grow={false}
          onMouseEnter={() => {
            onItemHover(ind);
          }}
          onMouseLeave={() => {
            onItemHover(null);
          }}
        >
          <PaletteLegend color={color}>{ranks?.[ind]}%</PaletteLegend>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
