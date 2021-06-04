/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel } from '@elastic/eui';
import React from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { APIReturnType } from '../../../services/rest/createCallApmApi';
import { SearchBar } from '../../shared/search_bar';
import { TraceList } from './TraceList';

type TracesAPIResponse = APIReturnType<'GET /api/apm/traces'>;
const DEFAULT_RESPONSE: TracesAPIResponse = {
  items: [],
  isAggregationAccurate: true,
  bucketSize: 0,
};

export function TraceOverview() {
  const {
    urlParams: { environment, kuery, start, end },
  } = useUrlParams();
  const { status, data = DEFAULT_RESPONSE } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/traces',
          params: {
            query: {
              environment,
              kuery,
              start,
              end,
            },
          },
        });
      }
    },
    [environment, kuery, start, end]
  );

  useTrackPageview({ app: 'apm', path: 'traces_overview' });
  useTrackPageview({ app: 'apm', path: 'traces_overview', delay: 15000 });

  return (
    <>
      <SearchBar />

      <EuiPanel hasShadow={false} paddingSize="none">
        <TraceList
          items={data.items}
          isLoading={status === FETCH_STATUS.LOADING}
        />
      </EuiPanel>
    </>
  );
}
