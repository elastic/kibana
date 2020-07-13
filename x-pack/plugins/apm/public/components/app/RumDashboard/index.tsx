/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
} from '@elastic/eui';
import { useTrackPageview } from '../../../../../observability/public';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { RumDashboard } from './RumDashboard';
import { ServiceNameFilter } from '../../shared/LocalUIFilters/ServiceNameFilter';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { useFetcher } from '../../../hooks/useFetcher';
import { RUM_AGENTS } from '../../../../common/agent_name';
import { EnvironmentFilter } from '../../shared/EnvironmentFilter';
import { LocalUIFilter } from '../../../../typings/ui_filters';

export function RumOverview() {
  useTrackPageview({ app: 'apm', path: 'rum_overview' });
  useTrackPageview({ app: 'apm', path: 'rum_overview', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['transactionUrl', 'location', 'device', 'os', 'browser'],
      projection: PROJECTION.RUM_OVERVIEW,
    };

    return config;
  }, []);

  const [filters, setFilters] = useState<LocalUIFilter[]>([]);

  const {
    urlParams: { start, end },
  } = useUrlParams();

  const { data } = useFetcher(
    (callApmApi) => {
      if (start && end) {
        return callApmApi({
          pathname: '/api/apm/rum-client/services',
          params: {
            query: {
              start,
              end,
              uiFilters: JSON.stringify({ agentName: RUM_AGENTS }),
            },
          },
        });
      }
    },
    [start, end]
  );

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <EnvironmentFilter />
          <EuiSpacer />
          <LocalUIFilters
            {...localUIFiltersConfig}
            showCount={true}
            onFiltersLoad={setFilters}
          >
            <>
              <ServiceNameFilter serviceNames={data ?? []} />
              <EuiSpacer size="xl" />
              <EuiHorizontalRule margin="none" />{' '}
            </>
          </LocalUIFilters>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <RumDashboard filters={filters} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
