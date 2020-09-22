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
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { getCoreVitalTooltipMessage, Thresholds } from './CoreVitalItem';
import { useUiSetting$ } from '../../../../../../../../src/plugins/kibana_react/public';

const PaletteLegend = styled(EuiHealth)`
  &:hover {
    cursor: pointer;
    text-decoration: underline;
  }
`;

const StyledSpan = styled.span<{
  darkMode: boolean;
}>`
  &:hover {
    background-color: ${(props) =>
      props.darkMode
        ? euiDarkVars.euiColorLightestShad
        : euiLightVars.euiColorLightestShade};
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
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

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
            <StyledSpan darkMode={darkMode}>
              <PaletteLegend color={color}>{ranks?.[ind]}%</PaletteLegend>
            </StyledSpan>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
