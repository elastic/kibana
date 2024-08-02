/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/react';
import { EmbeddableProfilingSearchBarProps } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { ProfilingSearchBar } from '../../components/profiling_app_page_template/profiling_search_bar';
import {
  ProfilingEmbeddableProvider,
  ProfilingEmbeddablesDependencies,
} from '../profiling_embeddable_provider';

export type EmbeddableSearchBarProps = EmbeddableProfilingSearchBarProps &
  ProfilingEmbeddablesDependencies;

export type EmbeddableSearchBarSharedComponent = React.FC<EmbeddableSearchBarProps>;

export function EmbeddableSearchBar({
  showDatePicker,
  kuery,
  onQuerySubmit,
  onRefresh,
  rangeFrom,
  rangeTo,
  ...deps
}: EmbeddableSearchBarProps) {
  return (
    <ProfilingEmbeddableProvider deps={deps}>
      <div
        css={css`
          width: 100%;
        `}
      >
        <ProfilingSearchBar
          showDatePicker={showDatePicker ?? true}
          showSubmitButton
          kuery={kuery}
          onQuerySubmit={({ dateRange, query }) => {
            onQuerySubmit({
              dateRange,
              query: typeof query?.query === 'string' ? query.query : '',
            });
          }}
          onRefresh={onRefresh}
          onRefreshClick={onRefresh}
          showQueryMenu={false}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      </div>
    </ProfilingEmbeddableProvider>
  );
}
