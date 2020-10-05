/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { URLFilter } from '../URLFilter';
import { EnvironmentFilter } from '../../../shared/EnvironmentFilter';
import { ServiceNameFilter } from '../URLFilter/ServiceNameFilter';
import { useFetcher } from '../../../../hooks/useFetcher';
import { RUM_AGENT_NAMES } from '../../../../../common/agent_name';
import { useUrlParams } from '../../../../hooks/useUrlParams';

export function MainFilters() {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  const { data, status } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum-client/services',
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
    <EuiFlexGroup>
      <EuiFlexItem>
        <URLFilter />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ServiceNameFilter
          loading={status !== 'success'}
          serviceNames={data ?? []}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EnvironmentFilter />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
