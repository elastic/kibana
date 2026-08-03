/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { useMemo } from 'react';
import { useSeverityColor } from '@kbn/ml-anomaly-utils';

export function useAnomalyChartPanelHighlight(anomalyScore?: number) {
  const borderColor = useSeverityColor(anomalyScore ?? 0);

  return useMemo(() => {
    if (anomalyScore == null) {
      return undefined;
    }

    return css({
      borderColor,
      borderStyle: 'solid',
      borderWidth: 2,
    });
  }, [anomalyScore, borderColor]);
}
