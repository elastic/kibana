/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchBarFilter } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { v4 } from 'uuid';
import { ProfilingSearchBar } from '../components/profiling_app_page_template/profiling_search_bar';

interface Props {
  onQuerySubmit: (filters: SearchBarFilter) => void;
  kuery?: string;
}

export function ProfilingEmbeddableSearchBar({ onQuerySubmit, kuery = '' }: Props) {
  return (
    <ProfilingSearchBar
      showDatePicker={false}
      showSubmitButton={false}
      kuery={kuery}
      onQuerySubmit={(next) => {
        const filters = String(next.query?.query || '');
        onQuerySubmit({ id: v4(), filters });
      }}
      onRefreshClick={() => {
        onQuerySubmit({ id: v4(), filters: kuery });
      }}
    />
  );
}
