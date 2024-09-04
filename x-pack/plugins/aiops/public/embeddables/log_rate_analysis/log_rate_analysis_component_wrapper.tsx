/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { useDataSource } from '../../hooks/use_data_source';
import type { LogRateAnalysisProps } from '../../shared_components/log_rate_analysis';
import LogRateAnalysisEmbeddable from '../../components/log_rate_analysis/log_rate_analysis_for_embeddable/log_rate_analysis_for_embeddable';

/**
 * Grid component wrapper for embeddable.
 *
 * @param lastReloadRequestTime
 * @param onError
 * @param onLoading
 * @param onRenderComplete
 * @param onChange
 * @param emptyState
 * @param timeRange
 * @constructor
 */
export const PatternAnalysisEmbeddableWrapper: FC<LogRateAnalysisProps> = ({
  dataViewId,
  lastReloadRequestTime,
  onError,
  onLoading,
  onRenderComplete,
  onChange,
  emptyState,
  timeRange,
}) => {
  const { dataView } = useDataSource();

  if (dataView.id !== dataViewId) {
    return null;
  }

  return (
    <div
      css={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
      }}
    >
      <LogRateAnalysisEmbeddable
        dataView={dataView}
        dataViewId={dataView.id!}
        lastReloadRequestTime={lastReloadRequestTime}
        timeRange={timeRange}
        onError={onError}
        onLoading={onLoading}
        onRenderComplete={onRenderComplete}
        onChange={onChange}
        emptyState={emptyState}
      />
    </div>
  );
};
