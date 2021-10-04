/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { XYBrushArea } from '@elastic/charts';

import type { TraceSample } from '../../../hooks/use_transaction_trace_samples_fetcher';

export interface TabContentProps {
  clearChartSelection: () => void;
  onFilter: () => void;
  sampleRangeFrom?: number;
  sampleRangeTo?: number;
  selectSampleFromChartSelection: (selection: XYBrushArea) => void;
  traceSamples: TraceSample[];
}
