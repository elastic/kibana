/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiHealth, transparentize } from '@elastic/eui';

import styled, { css } from 'styled-components';
import { euiLightVars } from '@kbn/ui-shared-deps-src/theme';
import { HostRiskSeverity } from '../../../../common/search_strategy';

const HOST_RISK_SEVERITY_COLOUR = {
  Unknown: euiLightVars.euiColorMediumShade,
  Low: euiLightVars.euiColorVis0,
  Moderate: euiLightVars.euiColorWarning,
  High: euiLightVars.euiColorVis9_behindText,
  Critical: euiLightVars.euiColorDanger,
};

const HostRiskBadge = styled.div<{ $severity: HostRiskSeverity }>`
  ${({ theme, $severity }) => css`
    width: fit-content;
    padding-right: ${theme.eui.paddingSizes.s};
    padding-left: ${theme.eui.paddingSizes.xs};

    ${($severity === 'Critical' || $severity === 'High') &&
    css`
      background-color: ${transparentize(theme.eui.euiColorDanger, 0.2)};
      border-radius: 999px; // pill shaped
    `};
  `}
`;

export const HostRiskScore: React.FC<{ severity: HostRiskSeverity }> = ({ severity }) => (
  <HostRiskBadge color={euiLightVars.euiColorDanger} $severity={severity}>
    <EuiHealth className="eui-alignMiddle" color={HOST_RISK_SEVERITY_COLOUR[severity]}>
      {severity}
    </EuiHealth>
  </HostRiskBadge>
);
