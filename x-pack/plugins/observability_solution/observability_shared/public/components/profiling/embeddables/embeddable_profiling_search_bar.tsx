/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EMBEDDABLE_PROFILING_SEARCH_BAR } from '.';
import { getProfilingComponent } from '../helpers/component_registry';

export interface EmbeddableProfilingSearchBarProps {
  kuery: string;
  showDatePicker?: boolean;
  onQuerySubmit: (params: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query: string;
  }) => void;
  onRefresh: () => void;
  rangeFrom: string;
  rangeTo: string;
}

export function EmbeddableProfilingSearchBar(props: EmbeddableProfilingSearchBarProps) {
  const EmbeddableProfilingSearchBarComponent =
    getProfilingComponent<EmbeddableProfilingSearchBarProps>(EMBEDDABLE_PROFILING_SEARCH_BAR);
  return (
    <div
      css={css`
        width: 100%;
        display: flex;
        flex: 1 1 100%;
        z-index: 1;
        min-height: 0;
      `}
    >
      {EmbeddableProfilingSearchBarComponent && (
        <EmbeddableProfilingSearchBarComponent {...props} />
      )}
    </div>
  );
}
