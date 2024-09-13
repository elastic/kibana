/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiHealth } from '@elastic/eui';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import * as I18n from './translations';

import {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  RISK_COLOR_CRITICAL,
  RISK_SCORE_LOW,
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../../../common/constants';

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
