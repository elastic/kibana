/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { EuiHealth } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import React from 'react';

import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import * as I18n from './translations';

export interface SeverityOptionItem {
  value: Severity;
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

export const defaultRiskScoreBySeverity: Record<Severity, number> = {
  low: 21,
  medium: 47,
  high: 73,
  critical: 99,
};
