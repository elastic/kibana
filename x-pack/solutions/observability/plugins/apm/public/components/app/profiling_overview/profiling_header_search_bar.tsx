/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableProfilingSearchBar } from '@kbn/observability-shared-plugin/public';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { isJavaAgentName as getIsJavaAgentName } from '../../../../common/agent_name';
import { useApmServiceContext } from '../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../hooks/use_apm_params';
import { useTimeRange } from '../../../hooks/use_time_range';
import { push } from '../../shared/links/url_helpers';
import { SearchBar } from '../../shared/search_bar/search_bar';

export function ProfilingHeaderSearchBar() {
  const history = useHistory();
  const {
    query: { rangeFrom, rangeTo, kuery },
  } = useApmParams('/services/{serviceName}/profiling');
  const { refreshTimeRange } = useTimeRange({ rangeFrom, rangeTo });
  const { agentName } = useApmServiceContext();
  const isJavaAgent = getIsJavaAgentName(agentName);

  if (isJavaAgent) {
    return <SearchBar showTransactionTypeSelector showEnvironmentFilter />;
  }

  return (
    <>
      <EmbeddableProfilingSearchBar
        kuery={kuery}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        onQuerySubmit={(next) => {
          push(history, {
            query: {
              kuery: next.query,
              rangeFrom: next.dateRange.from,
              rangeTo: next.dateRange.to,
            },
          });
        }}
        onRefresh={refreshTimeRange}
      />
      <SearchBar showUnifiedSearchBar={false} showEnvironmentFilter />
    </>
  );
}
