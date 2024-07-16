/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useSelector } from '@xstate/react';
import { DataStreamStat } from '../../common/data_streams_stats/data_stream_stat';
import { useDatasetQualityTable } from '.';
import { useDatasetQualityContext } from '../components/dataset_quality/context';
import { filterInactiveDatasets } from '../utils';

const useSummaryPanel = () => {
  const { service } = useDatasetQualityContext();
  const {
    filteredItems,
    isSizeStatsAvailable,
    canUserMonitorDataset,
    canUserMonitorAnyDataStream,
  } = useDatasetQualityTable();

  const { timeRange } = useSelector(service, (state) => state.context.filters);

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
    User Authorization
  */
  const canUserMonitorAllFilteredDataStreams = filteredItems.every(
    (item) => item.userPrivileges?.canMonitor ?? true
  );

  const isUserAuthorizedForDataset =
    canUserMonitorDataset && canUserMonitorAnyDataStream && canUserMonitorAllFilteredDataStreams;

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
  const estimatedData = filteredItems.reduce(
    (acc, curr) => acc + DataStreamStat.calculateFilteredSize(curr),
    0
  );

  const isEstimatedDataLoading = useSelector(
    service,
    (state) => state.matches('datasets.fetching') || state.matches('degradedDocs.fetching')
  );

  return {
    datasetsQuality,
    isDatasetsQualityLoading,

    isUserAuthorizedForDataset,

    isEstimatedDataLoading,
    estimatedData,
    isEstimatedDataDisabled: !isSizeStatsAvailable,

    isDatasetsActivityLoading,
    datasetsActivity,
  };
};

const [SummaryPanelProvider, useSummaryPanelContext] = createContainer(useSummaryPanel);

export { useSummaryPanelContext };

// eslint-disable-next-line import/no-default-export
export default SummaryPanelProvider;
