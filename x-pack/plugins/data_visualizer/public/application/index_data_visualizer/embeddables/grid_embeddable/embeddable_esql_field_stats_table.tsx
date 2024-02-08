/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EmbeddableInput } from '@kbn/embeddable-plugin/public';
import type { FieldVisConfig } from '../../../../../common/types/field_vis_config';
import { DataVisualizerTableState } from '../../../../../common/types';
import { DataVisualizerTable } from '../../../common/components/stats_table';

import {
  getDefaultESQLDataVisualizerListState,
  useESQLDataVisualizerData,
} from '../../hooks/esql/use_data_visualizer_esql_data';
import {
  ESQLDataVisualizerGridEmbeddableInput,
  ESQLDataVisualizerIndexBasedAppState,
} from './types';

const restorableDefaults = getDefaultESQLDataVisualizerListState();

export const ESQLFieldStatsTableWrapper = ({
  input,
  onOutputChange,
}: {
  input: EmbeddableInput & ESQLDataVisualizerGridEmbeddableInput;
  onOutputChange?: (ouput: any) => void;
}) => {
  // @TODO: remove
  console.log(`--@@ESQLFieldStatsTableWrapper`, input);
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
    // searchQueryLanguage,
    // searchString,
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
    // @TODO: refactor this to common
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: '1 0 100%',
          textAlign: 'center',
        }}
      >
        <EuiText size="xs" color="subdued">
          <EuiIcon type="visualizeApp" size="m" color="subdued" />
          <EuiSpacer size="m" />
          <FormattedMessage
            id="xpack.dataVisualizer.index.embeddableNoResultsMessage"
            defaultMessage="No results found"
          />
        </EuiText>
      </div>
    );
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
