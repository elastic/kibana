/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

import { TransactionDistribution } from './distribution';
import { useWaterfallFetcher } from './use_waterfall_fetcher';
import type { TabContentProps } from './types';
import { WaterfallWithSummary } from './waterfall_with_summary';

function TraceSamplesTab({
  selectSampleFromChartSelection,
  clearChartSelection,
  sampleRangeFrom,
  sampleRangeTo,
  traceSamples,
}: TabContentProps) {
  const { urlParams } = useUrlParams();

  const {
    waterfall,
    exceedsMax,
    status: waterfallStatus,
  } = useWaterfallFetcher();

  return (
    <>
      <TransactionDistribution
        onChartSelection={selectSampleFromChartSelection}
        onClearSelection={clearChartSelection}
        selection={
          sampleRangeFrom !== undefined && sampleRangeTo !== undefined
            ? [sampleRangeFrom, sampleRangeTo]
            : undefined
        }
        markerCurrentTransaction={
          waterfall.entryWaterfallTransaction?.doc.transaction.duration.us
        }
      />

      <EuiSpacer size="s" />

      <WaterfallWithSummary
        urlParams={urlParams}
        waterfall={waterfall}
        isLoading={waterfallStatus === FETCH_STATUS.LOADING}
        exceedsMax={exceedsMax}
        traceSamples={traceSamples}
      />
    </>
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
