/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiPaletteWarm } from '@elastic/eui';

import {
  RISK_COLOR_LOW,
  RISK_COLOR_MEDIUM,
  RISK_COLOR_HIGH,
  RISK_COLOR_CRITICAL,
  RISK_SCORE_MEDIUM,
  RISK_SCORE_HIGH,
  RISK_SCORE_CRITICAL,
} from '../../components/rules/step_about_rule/data';

export const getFillColor = ({
  riskScore,
  useWarmPalette,
}: {
  riskScore: number;
  useWarmPalette: boolean;
}): string => {
  const MIN_RISK_SCORE = 0;
  const MAX_RISK_SCORE = 100;

  const clampedScore =
    riskScore < MIN_RISK_SCORE
      ? MIN_RISK_SCORE
      : riskScore > MAX_RISK_SCORE
      ? MAX_RISK_SCORE
      : riskScore;

  if (useWarmPalette) {
    return euiPaletteWarm(MAX_RISK_SCORE + 1)[clampedScore];
  }

  if (clampedScore >= RISK_SCORE_CRITICAL) {
    return RISK_COLOR_CRITICAL;
  } else if (clampedScore >= RISK_SCORE_HIGH) {
    return RISK_COLOR_HIGH;
  } else if (clampedScore >= RISK_SCORE_MEDIUM) {
    return RISK_COLOR_MEDIUM;
  } else {
    return RISK_COLOR_LOW;
  }
};
