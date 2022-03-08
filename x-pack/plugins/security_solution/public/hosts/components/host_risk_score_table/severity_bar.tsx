/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiColorPaletteDisplay } from '@elastic/eui';
import React, { useMemo } from 'react';

import { HostRiskSeverity } from '../../../../common/search_strategy';
import { HOST_RISK_SEVERITY_COLOUR } from '../common/host_risk_score';
import { SeverityCount } from '../../containers/kpi_hosts/risky_hosts';

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
      (Object.keys(HOST_RISK_SEVERITY_COLOUR) as HostRiskSeverity[]).reduce(
        (acc: PalletteArray, status: HostRiskSeverity) => {
          const previousStop = acc.length > 0 ? acc[acc.length - 1].stop : 0;
          const newEntry: PalletteObject = {
            stop: previousStop + (severityCount[status] || 0),
            color: HOST_RISK_SEVERITY_COLOUR[status],
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
