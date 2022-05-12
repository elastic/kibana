/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { TransactionDistribution } from './distribution';
import type { TabContentProps } from './types';

function TraceSamplesTab({
  selectSampleFromChartSelection,
  clearChartSelection,
  sampleRangeFrom,
  sampleRangeTo,
  traceSamples,
  traceSamplesStatus,
}: TabContentProps) {
  return (
    <TransactionDistribution
      onChartSelection={selectSampleFromChartSelection}
      onClearSelection={clearChartSelection}
      selection={
        sampleRangeFrom !== undefined && sampleRangeTo !== undefined
          ? [sampleRangeFrom, sampleRangeTo]
          : undefined
      }
      traceSamplesStatus={traceSamplesStatus}
      traceSamples={traceSamples}
    />
  );
}

export const traceSamplesTab = {
  dataTestSubj: 'apmTraceSamplesTabButton',
  key: 'traceSamples',
  label: i18n.translate('xpack.apm.transactionDetails.tabs.traceSamplesLabel', {
    defaultMessage: 'Trace samples',
  }),
  component: TraceSamplesTab,
};
