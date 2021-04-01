/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { PackageCustomExtensionComponentProps } from '../../../fleet/public';
import { CustomTabTabs } from './components/custom_tab_tabs';
import { Navigation } from './components/navigation';

const queryClient = new QueryClient();

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app custom tab
 */
export const OsqueryManagedCustomExtension = React.memo<PackageCustomExtensionComponentProps>(
  () => (
    <QueryClientProvider client={queryClient}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <Navigation />
        </EuiFlexItem>
        <EuiFlexItem>
          <CustomTabTabs />
        </EuiFlexItem>
      </EuiFlexGroup>
    </QueryClientProvider>
  )
);
OsqueryManagedCustomExtension.displayName = 'OsqueryManagedCustomExtension';
