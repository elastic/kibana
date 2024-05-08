/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { IToasts } from '@kbn/core-notifications-browser';
import { IDataStreamsStatsClient } from '../services/data_streams_stats';
import { createDatasetsSummaryPanelStateMachine } from '../state_machines/summary_panel';
import { useDatasetQualityTable } from '.';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { filterInactiveDatasets } from '../utils';

interface SummaryPanelContextDeps {
  dataStreamStatsClient: IDataStreamsStatsClient;
  toasts: IToasts;
}

const useSummaryPanel = ({ dataStreamStatsClient, toasts }: SummaryPanelContextDeps) => {
  const { service } = useDatasetQualityContext();
  const { filteredItems } = useDatasetQualityTable();

  const { timeRange } = useSelector(service, (state) => state.context.filters);

  const summaryPanelStateService = useInterpret(() =>
    createDatasetsSummaryPanelStateMachine({
      dataStreamStatsClient,
      toasts,
    })
  );

  /*
    Datasets Quality
  */

  const datasetsQuality = {
    percentages: filteredItems.map((item) => item.degradedDocs.percentage),
  };

  const isDatasetsQualityLoading = useSelector(service, (state) =>
    state.matches('degradedDocs.fetching')
  );

  /*
    Datasets Activity
  */
  const datasetsActivity = {
    total: filteredItems.length,
    active: filterInactiveDatasets({
      datasets: filteredItems,
      timeRange,
    }).length,
  };

  const isDatasetsActivityLoading = useSelector(service, (state) =>
    state.matches('datasets.fetching')
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
    estimatedData,
    isEstimatedDataDisabled,

    isDatasetsActivityLoading,
    datasetsActivity,
  };
};

const [SummaryPanelProvider, useSummaryPanelContext] = createContainer(useSummaryPanel);

export { useSummaryPanelContext };

// eslint-disable-next-line import/no-default-export
export default SummaryPanelProvider;
