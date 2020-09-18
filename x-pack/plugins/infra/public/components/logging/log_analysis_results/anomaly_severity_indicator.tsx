/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHealth } from '@elastic/eui';
import React, { useMemo } from 'react';
import {
  formatAnomalyScore,
  getSeverityCategoryForScore,
  ML_SEVERITY_COLORS,
} from '../../../../common/log_analysis';

export const AnomalySeverityIndicator: React.FunctionComponent<{
  anomalyScore: number;
}> = ({ anomalyScore }) => {
  const severityColor = useMemo(() => getColorForAnomalyScore(anomalyScore), [anomalyScore]);

  return <EuiHealth color={severityColor}>{formatAnomalyScore(anomalyScore)}</EuiHealth>;
};

const getColorForAnomalyScore = (anomalyScore: number) => {
  const severityCategory = getSeverityCategoryForScore(anomalyScore);

  if (severityCategory != null && severityCategory in ML_SEVERITY_COLORS) {
    return ML_SEVERITY_COLORS[severityCategory];
  } else {
    return 'subdued';
  }
};
