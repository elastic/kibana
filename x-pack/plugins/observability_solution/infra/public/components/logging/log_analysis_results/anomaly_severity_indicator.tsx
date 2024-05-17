/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiHealth } from '@elastic/eui';
import { getFormattedSeverityScore } from '@kbn/ml-anomaly-utils/get_formatted_severity_score';
import React, { useMemo } from 'react';
import { ML_SEVERITY_COLORS, getSeverityCategoryForScore } from '../../../../common/log_analysis';

export const AnomalySeverityIndicator: React.FunctionComponent<{
  anomalyScore: number;
}> = ({ anomalyScore }) => {
  const severityColor = useMemo(() => getColorForAnomalyScore(anomalyScore), [anomalyScore]);

  return <EuiHealth color={severityColor}>{getFormattedSeverityScore(anomalyScore)}</EuiHealth>;
};

const getColorForAnomalyScore = (anomalyScore: number) => {
  const severityCategory = getSeverityCategoryForScore(anomalyScore);

  if (severityCategory != null && severityCategory in ML_SEVERITY_COLORS) {
    return ML_SEVERITY_COLORS[severityCategory];
  } else {
    return 'subdued';
  }
};
