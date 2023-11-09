/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { v4 } from 'uuid';
import { SearchBarParams } from '@kbn/observability-shared-plugin/public';
import { ProfilingSearchBar } from '../components/profiling_app_page_template/profiling_search_bar';

interface Props {
  onQuerySubmit: (filters: SearchBarParams) => void;
}

export function ProfilingEmbeddableSearchBar({ onQuerySubmit }: Props) {
  const [kuery, setKuery] = useState('');
  return (
    <ProfilingSearchBar
      showDatePicker={false}
      showSubmitButton={false}
      kuery={kuery}
      onQuerySubmit={(next) => {
        const filters = String(next.query?.query || '');
        setKuery(filters);
        onQuerySubmit({ id: v4(), filters });
      }}
      // No need to implement refresh click as the date picker is not available
      onRefreshClick={() => {}}
    />
  );
}
