/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import { RiskSeverity } from '../../../common/search_strategy';
import { SEVERITY_COLOR } from '../../overview/components/detection_response/utils';

export const SEVERITY_UI_SORT_ORDER = [
  RiskSeverity.unknown,
  RiskSeverity.low,
  RiskSeverity.moderate,
  RiskSeverity.high,
  RiskSeverity.critical,
];

export const RISK_SEVERITY_COLOUR: { [k in RiskSeverity]: string } = {
  [RiskSeverity.unknown]: euiLightVars.euiColorMediumShade,
  [RiskSeverity.low]: SEVERITY_COLOR.low,
  [RiskSeverity.moderate]: SEVERITY_COLOR.medium,
  [RiskSeverity.high]: SEVERITY_COLOR.high,
  [RiskSeverity.critical]: SEVERITY_COLOR.critical,
};

export const RISK_SCORE_RANGES = {
  [RiskSeverity.unknown]: { start: 0, stop: 20 },
  [RiskSeverity.low]: { start: 20, stop: 40 },
  [RiskSeverity.moderate]: { start: 40, stop: 70 },
  [RiskSeverity.high]: { start: 70, stop: 90 },
  [RiskSeverity.critical]: { start: 90, stop: 100 },
};
