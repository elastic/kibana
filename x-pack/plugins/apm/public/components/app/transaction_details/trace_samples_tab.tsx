/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { TransactionDistribution } from './distribution';
import { TabContentProps } from './transaction_details_tabs';

function TraceSamplesTab({
  selectSampleFromChartSelection,
  clearChartSelection,
  sampleRangeFrom,
  sampleRangeTo,
  traceSamplesFetchResult,
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
      traceSamplesFetchResult={traceSamplesFetchResult}
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
