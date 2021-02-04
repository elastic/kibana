/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { useMemo } from 'react';
import { useTrackPageview } from '../../../../../observability/public';
import { LocalUIFilters } from './LocalUIFilters';
import { RumDashboard } from './RumDashboard';
import { URLFilter } from './URLFilter';

export function RumOverview() {
  useTrackPageview({ app: 'ux', path: 'home' });
  useTrackPageview({ app: 'ux', path: 'home', delay: 15000 });

  const localUIFiltersConfig = useMemo(() => {
    const config: React.ComponentProps<typeof LocalUIFilters> = {
      filterNames: ['location', 'device', 'os', 'browser'],
    };

    return config;
  }, []);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem grow={1}>
          <LocalUIFilters {...localUIFiltersConfig} showCount={true}>
            <URLFilter />
            <EuiSpacer size="s" />
          </LocalUIFilters>
        </EuiFlexItem>
        <EuiFlexItem grow={7}>
          <RumDashboard />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
