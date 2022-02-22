/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import React, { useMemo } from 'react';

import { RiskSeverity } from '../../../../common/search_strategy';
import { RISK_SEVERITY_COLOUR } from './common';
import { SeverityCount } from './types';

const StyledEuiColorPaletteDisplay = styled(EuiColorPaletteDisplay)`
  &.risk-score-severity-bar {
    border: none;
    border-radius: 0;
    &:after {
      border: none;
    }
  }
`;
interface PalletteObject {
  stop: number;
  color: string;
}
type PalletteArray = PalletteObject[];

export const SeverityBar: React.FC<{
  severityCount: SeverityCount;
}> = ({ severityCount }) => {
  const palette = useMemo(
    () =>
      (Object.keys(RISK_SEVERITY_COLOUR) as RiskSeverity[]).reduce(
        (acc: PalletteArray, status: RiskSeverity) => {
          const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
          const newEntry: PalletteObject = {
            stop: previousStop + (severityCount[status] || 0),
            color: RISK_SEVERITY_COLOUR[status],
          };
          acc.push(newEntry);
          return acc;
        },
        [] as PalletteArray
      ),
    [severityCount]
  );
  return (
    <StyledEuiColorPaletteDisplay
      className="risk-score-severity-bar"
      data-test-subj="risk-score-severity-bar"
      size="s"
      palette={palette}
    />
  );
};
