/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import styled from 'styled-components';
import { EuiHealth } from '@elastic/eui';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import * as I18n from './translations';

export type SeverityValue = 'low' | 'medium' | 'high' | 'critical';

interface SeverityOptionItem {
  value: SeverityValue;
  inputDisplay: React.ReactElement;
}

const StyledEuiHealth = styled(EuiHealth)`
  line-height: inherit;
`;

export const severityOptions: SeverityOptionItem[] = [
  {
    value: 'low',
    inputDisplay: <StyledEuiHealth color={euiLightVars.euiColorVis0}>{I18n.LOW}</StyledEuiHealth>,
  },
  {
    value: 'medium',
    inputDisplay: (
      <StyledEuiHealth color={euiLightVars.euiColorVis5}>{I18n.MEDIUM}</StyledEuiHealth>
    ),
  },
  {
    value: 'high',
    inputDisplay: <StyledEuiHealth color={euiLightVars.euiColorVis7}>{I18n.HIGH}</StyledEuiHealth>,
  },
  {
    value: 'critical',
    inputDisplay: (
      <StyledEuiHealth color={euiLightVars.euiColorVis9}>{I18n.CRITICAL}</StyledEuiHealth>
    ),
  },
];

export const defaultRiskScoreBySeverity: Record<SeverityValue, number> = {
  low: 21,
  medium: 47,
  high: 73,
  critical: 99,
};
