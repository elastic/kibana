/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth, IconColor } from '@elastic/eui';
import React from 'react';

export const OverviewRiskScore = React.memo<{ riskScore: string }>(({ riskScore }) => {
  return <EuiHealth color={riskScoreToColor(riskScore)}>{riskScore}</EuiHealth>;
});

// TODO: Ask design about other color maps
// TODO: Ask design if we should use this component everywhere we display the risk score. If yes, move this to <FormattedFieldValue />.
function riskScoreToColor(riskScore: string): IconColor {
  const riskScoreNumber = parseInt(riskScore, 10);
  if (riskScoreNumber > 99) {
    return 'danger';
  } else if (riskScoreNumber > 45) {
    return 'warning';
  }

  return 'subdued';
}

OverviewRiskScore.displayName = 'OverviewRiskScore';
