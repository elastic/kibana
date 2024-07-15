/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { useDataSource } from '../../hooks/use_data_source';
import type { PatternAnalysisProps } from '../../shared_components/pattern_analysis';
import LogCategorizationEmbeddable from '../../components/log_categorization/log_categorization_for_embeddable/log_categorization_for_embeddable';

/**
 * Grid component wrapper for embeddable.
 *
 * @param fieldName
 * @param minimumTimeRangeOption
 * @param randomSamplerMode
 * @param randomSamplerProbability
 * @param lastReloadRequestTime
 * @param onError
 * @param onLoading
 * @param onRenderComplete
 * @param onChange
 * @param emptyState
 * @param timeRange
 * @constructor
 */
export const PatternAnalysisEmbeddableWrapper: FC<PatternAnalysisProps> = ({
  fieldName,
  minimumTimeRangeOption,
  randomSamplerMode,
  randomSamplerProbability,
  lastReloadRequestTime,
  onError,
  onLoading,
  onRenderComplete,
  onChange,
  emptyState,
  timeRange,
}) => {
  const { dataView } = useDataSource();

  return (
    <div
      css={{
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '10px',
      }}
    >
      <LogCategorizationEmbeddable
        input={{
          dataView,
          dataViewId: dataView.id!,
          fieldName,
          minimumTimeRangeOption,
          randomSamplerProbability,
          randomSamplerMode,
          lastReloadRequestTime,
          timeRange,
          onError,
          onLoading,
          onRenderComplete,
          onChange,
          emptyState,
        }}
      />
    </div>
  );
};
