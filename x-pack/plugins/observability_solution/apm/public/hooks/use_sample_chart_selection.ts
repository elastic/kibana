/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYBrushEvent } from '@elastic/charts';
import { useHistory } from 'react-router-dom';
import { push } from '../components/shared/links/url_helpers';

export function useSampleChartSelection() {
  const history = useHistory();
  const selectSampleFromChartSelection = (selection: XYBrushEvent) => {
    if (selection !== undefined) {
      const { x } = selection;
      if (Array.isArray(x)) {
        push(history, {
          query: {
            sampleRangeFrom: Math.round(x[0]).toString(),
            sampleRangeTo: Math.round(x[1]).toString(),
          },
        });
      }
    }
  };

  const clearChartSelection = () => {
    // enforces a reset of the current sample to be highlighted in the chart
    // and selected in waterfall section below, otherwise we end up with
    // stale data for the selected sample
    push(history, {
      query: {
        sampleRangeFrom: '',
        sampleRangeTo: '',
        traceId: '',
        transactionId: '',
      },
    });
  };

  return {
    selectSampleFromChartSelection,
    clearChartSelection,
  };
}
