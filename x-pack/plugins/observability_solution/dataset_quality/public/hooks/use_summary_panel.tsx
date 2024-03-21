/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { IToasts } from '@kbn/core-notifications-browser';
import { DatasetQualityConfig } from '../../common';
import { IDataStreamsStatsClient } from '../services/data_streams_stats';
import { createDatasetsSummaryPanelStateMachine } from '../state_machines/summary_panel';

interface SummaryPanelContextDeps {
  dataStreamStatsClient: IDataStreamsStatsClient;
  toasts: IToasts;
  pluginConfig: DatasetQualityConfig;
}

const useSummaryPanel = ({
  dataStreamStatsClient,
  toasts,
  pluginConfig,
}: SummaryPanelContextDeps) => {
  const summaryPanelStateService = useInterpret(() =>
    createDatasetsSummaryPanelStateMachine({
      dataStreamStatsClient,
      toasts,
      pluginConfig,
    })
  );

  /*
    Datasets Quality
  */
  const datasetsQuality = useSelector(
    summaryPanelStateService,
    (state) => state.context.datasetsQuality
  );
  const isDatasetsQualityLoading = useSelector(
    summaryPanelStateService,
    (state) =>
      state.matches('datasetsQuality.fetching') ||
      state.matches('datasetsQuality.retrying') ||
      state.matches('datasetsActivity.fetching')
  );

  /*
    Datasets Activity
  */
  const datasetsActivity = useSelector(
    summaryPanelStateService,
    (state) => state.context.datasetsActivity
  );
  const isDatasetsActivityLoading = useSelector(
    summaryPanelStateService,
    (state) =>
      state.matches('datasetsActivity.fetching') || state.matches('datasetsActivity.retrying')
  );

  /*
    Estimated Data
  */
  const estimatedData = useSelector(
    summaryPanelStateService,
    (state) => state.context.estimatedData
  );
  const isEstimatedDataLoading = useSelector(
    summaryPanelStateService,
    (state) => state.matches('estimatedData.fetching') || state.matches('estimatedData.retrying')
  );
  const isEstimatedDataDisabled = useSelector(summaryPanelStateService, (state) =>
    state.matches('estimatedData.disabled')
  );

  return {
    datasetsQuality,
    isDatasetsQualityLoading,

    isEstimatedDataLoading,
    isEstimatedDataDisabled,
    estimatedData,

    isDatasetsActivityLoading,
    datasetsActivity,
  };
};

const [SummaryPanelProvider, useSummaryPanelContext] = createContainer(useSummaryPanel);

export { useSummaryPanelContext };

// eslint-disable-next-line import/no-default-export
export default SummaryPanelProvider;
