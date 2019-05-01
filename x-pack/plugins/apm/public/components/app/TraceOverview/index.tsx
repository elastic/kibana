/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { FETCH_STATUS, useFetcher } from '../../../hooks/useFetcher';
import { loadTraceList } from '../../../services/rest/apm/traces';
import { TraceList } from './TraceList';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useUiFilters } from '../../../hooks/useUiFilters';

export function TraceOverview() {
  const { urlParams } = useUrlParams();
  const { uiFilters, uiFiltersKey } = useUiFilters();
  const { start, end } = urlParams;
  const { status, data = [] } = useFetcher(
    () => {
      if (start && end) {
        return loadTraceList({ start, end, uiFilters });
      }
    },
    [start, end, uiFiltersKey]
  );

  return (
    <EuiPanel>
      <TraceList items={data} isLoading={status === FETCH_STATUS.LOADING} />
    </EuiPanel>
  );
}
