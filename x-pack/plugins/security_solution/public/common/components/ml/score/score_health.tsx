/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';

interface Props {
  score: number;
}

export const getScoreString = (score: number) => String(Math.ceil(score));

export const ScoreHealth = React.memo<Props>(({ score }) => {
  const scoreCeiling = getScoreString(score);
  const color = getSeverityColor(score);
  return <EuiHealth color={color}>{scoreCeiling}</EuiHealth>;
});

ScoreHealth.displayName = 'ScoreHealth';

// ಠ_ಠ A hard-fork of the `ml` ml/common/util/anomaly_utils.js#getSeverityColor ಠ_ಠ
//
// Returns a severity label (one of critical, major, minor, warning, low or unknown)
// for the supplied normalized anomaly score (a value between 0 and 100), where scores
// less than 3 are assigned a severity of 'low'.
export const getSeverityColor = (normalizedScore: number): string => {
  if (normalizedScore >= 75) {
    return '#fe5050';
  } else if (normalizedScore >= 50) {
    return '#fba740';
  } else if (normalizedScore >= 25) {
    return '#fdec25';
  } else if (normalizedScore >= 3) {
    return '#8bc8fb';
  } else if (normalizedScore >= 0) {
    return '#d2e9f7';
  } else {
    return '#ffffff';
  }
};
