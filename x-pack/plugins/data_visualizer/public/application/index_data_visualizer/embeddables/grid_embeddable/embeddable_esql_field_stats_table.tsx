/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { FieldVisConfig } from '../../../../../common/types/field_vis_config';
import type { DataVisualizerTableState } from '../../../../../common/types';
import { DataVisualizerTable } from '../../../common/components/stats_table';

import {
  getDefaultESQLDataVisualizerListState,
  useESQLDataVisualizerData,
} from '../../hooks/esql/use_data_visualizer_esql_data';
import type {
  ESQLDataVisualizerGridEmbeddableState,
  ESQLDataVisualizerIndexBasedAppState,
} from './types';
import { EmbeddableNoResultsEmptyPrompt } from './embeddable_field_stats_no_results';

const restorableDefaults = getDefaultESQLDataVisualizerListState();

const EmbeddableESQLFieldStatsTableWrapper = (props: ESQLDataVisualizerGridEmbeddableState) => {
  const { onTableUpdate, ...state } = props;
  const [dataVisualizerListState, setDataVisualizerListState] =
    useState<Required<ESQLDataVisualizerIndexBasedAppState>>(restorableDefaults);

  const onTableChange = useCallback(
    (update: DataVisualizerTableState) => {
      setDataVisualizerListState({ ...dataVisualizerListState, ...update });
      if (onTableUpdate) {
        onTableUpdate(update);
      }
    },
    [dataVisualizerListState, onTableUpdate]
  );

  const {
    configs,
    extendedColumns,
    progress,
    overallStatsProgress,
    setLastRefresh,
    getItemIdToExpandedRowMap,
  } = useESQLDataVisualizerData(state, dataVisualizerListState);

  useEffect(() => {
    setLastRefresh(Date.now());
  }, [state?.lastReloadRequestTime, setLastRefresh]);

  if (progress === 100 && configs.length === 0) {
    return <EmbeddableNoResultsEmptyPrompt />;
  }
  return (
    <DataVisualizerTable<FieldVisConfig>
      items={configs}
      pageState={dataVisualizerListState}
      updatePageState={onTableChange}
      getItemIdToExpandedRowMap={getItemIdToExpandedRowMap}
      extendedColumns={extendedColumns}
      showPreviewByDefault={state?.showPreviewByDefault}
      onChange={onTableUpdate}
      loading={progress < 100}
      overallStatsRunning={overallStatsProgress.isRunning}
    />
  );
};
// exporting as default so it be lazy-loaded
// eslint-disable-next-line import/no-default-export
export default EmbeddableESQLFieldStatsTableWrapper;
