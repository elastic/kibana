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
  EuiToolTip,
} from '@elastic/eui';
import styled from 'styled-components';
import { getCoreVitalTooltipMessage, Thresholds } from './CoreVitalItem';

const PaletteLegend = styled(EuiHealth)`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
    background-color: #e7f0f7;
  }
`;

interface Props {
  onItemHover: (ind: number | null) => void;
  ranks: number[];
  thresholds: Thresholds;
  title: string;
}

export function PaletteLegends({
  ranks,
  title,
  onItemHover,
  thresholds,
}: Props) {
  const palette = euiPaletteForStatus(3);

  return (
    <EuiFlexGroup responsive={false}>
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
          <EuiToolTip
            content={getCoreVitalTooltipMessage(
              thresholds,
              ind,
              title,
              ranks[ind]
            )}
            position="bottom"
          >
            <PaletteLegend color={color}>{ranks?.[ind]}%</PaletteLegend>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
