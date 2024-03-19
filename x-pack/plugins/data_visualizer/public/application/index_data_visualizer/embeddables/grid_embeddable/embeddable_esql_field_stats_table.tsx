/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import type { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { FieldVisConfig } from '../../../../../common/types/field_vis_config';
import type { DataVisualizerTableState } from '../../../../../common/types';
import { DataVisualizerTable } from '../../../common/components/stats_table';

import {
  getDefaultESQLDataVisualizerListState,
  useESQLDataVisualizerData,
} from '../../hooks/esql/use_data_visualizer_esql_data';
import type {
  ESQLDataVisualizerGridEmbeddableInput,
  ESQLDataVisualizerIndexBasedAppState,
} from './types';
import { EmbeddableNoResultsEmptyPrompt } from './embeddable_field_stats_no_results';

const restorableDefaults = getDefaultESQLDataVisualizerListState();

export const EmbeddableESQLFieldStatsTableWrapper = ({
  input,
  onOutputChange,
}: {
  input: EmbeddableInput & ESQLDataVisualizerGridEmbeddableInput;
  onOutputChange?: (ouput: any) => void;
}) => {
  const [dataVisualizerListState, setDataVisualizerListState] =
    useState<Required<ESQLDataVisualizerIndexBasedAppState>>(restorableDefaults);

  const onTableChange = useCallback(
    (update: DataVisualizerTableState) => {
      setDataVisualizerListState({ ...dataVisualizerListState, ...update });
      if (onOutputChange) {
        onOutputChange(update);
      }
    },
    [dataVisualizerListState, onOutputChange]
  );

  const {
    configs,
    extendedColumns,
    progress,
    overallStatsProgress,
    setLastRefresh,
    getItemIdToExpandedRowMap,
  } = useESQLDataVisualizerData(input, dataVisualizerListState);

  useEffect(() => {
    setLastRefresh(Date.now());
  }, [input?.lastReloadRequestTime, setLastRefresh]);

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
      showPreviewByDefault={input?.showPreviewByDefault}
      onChange={onOutputChange}
      loading={progress < 100}
      overallStatsRunning={overallStatsProgress.isRunning}
    />
  );
};
