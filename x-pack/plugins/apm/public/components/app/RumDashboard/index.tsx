/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { LocalUIFilters } from '../../shared/LocalUIFilters';
import { PROJECTION } from '../../../../common/projections/typings';
import { RumDashboard } from './RumDashboard';

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

  return (
    <>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} showCount={true} />
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <RumDashboard />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
