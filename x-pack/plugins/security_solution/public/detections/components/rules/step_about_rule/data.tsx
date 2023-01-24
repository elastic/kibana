/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiHealth } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import * as I18n from './translations';

export interface SeverityOptionItem {
  value: Severity;
  inputDisplay: React.ReactElement;
}

const StyledEuiHealth = styled(EuiHealth)`
  line-height: inherit;
`;

export const RISK_COLOR_LOW = euiLightVars.euiColorVis0;
export const RISK_COLOR_MEDIUM = euiLightVars.euiColorVis5;
export const RISK_COLOR_HIGH = euiLightVars.euiColorVis7;
export const RISK_COLOR_CRITICAL = euiLightVars.euiColorVis9;

export const RISK_SCORE_LOW = 21;
export const RISK_SCORE_MEDIUM = 47;
export const RISK_SCORE_HIGH = 73;
export const RISK_SCORE_CRITICAL = 99;

export const severityOptions: SeverityOptionItem[] = [
  {
    value: 'low',
    inputDisplay: <StyledEuiHealth color={RISK_COLOR_LOW}>{I18n.LOW}</StyledEuiHealth>,
  },
  {
    value: 'medium',
    inputDisplay: <StyledEuiHealth color={RISK_COLOR_MEDIUM}>{I18n.MEDIUM}</StyledEuiHealth>,
  },
  {
    value: 'high',
    inputDisplay: <StyledEuiHealth color={RISK_COLOR_HIGH}>{I18n.HIGH}</StyledEuiHealth>,
  },
  {
    value: 'critical',
    inputDisplay: <StyledEuiHealth color={RISK_COLOR_CRITICAL}>{I18n.CRITICAL}</StyledEuiHealth>,
  },
];

export const defaultRiskScoreBySeverity: Record<Severity, number> = {
  low: RISK_SCORE_LOW,
  medium: RISK_SCORE_MEDIUM,
  high: RISK_SCORE_HIGH,
  critical: RISK_SCORE_CRITICAL,
};
