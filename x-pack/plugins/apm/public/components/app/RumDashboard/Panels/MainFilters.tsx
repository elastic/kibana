/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { EnvironmentFilter } from '../../../shared/EnvironmentFilter';
import { ServiceNameFilter } from '../URLFilter/ServiceNameFilter';
import { useFetcher } from '../../../../hooks/use_fetcher';
import { RUM_AGENT_NAMES } from '../../../../../common/agent_name';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { UserPercentile } from '../UserPercentile';

export function MainFilters() {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          endpoint: 'GET /api/apm/rum-client/services',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify({ agentName: RUM_AGENT_NAMES }),
            },
          },
        });
      }
    },
    [start, end]
  );

  return (
    <>
      <EuiFlexItem grow={false}>
        <ServiceNameFilter
          loading={status !== 'success'}
          serviceNames={data ?? []}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} style={{ maxWidth: 200 }}>
        <EnvironmentFilter />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <UserPercentile />
      </EuiFlexItem>
    </>
  );
}
