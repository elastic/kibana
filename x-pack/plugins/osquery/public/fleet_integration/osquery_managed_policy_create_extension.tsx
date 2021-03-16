/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { PackagePolicyCreateExtensionComponentProps } from '../../../fleet/public';
import { ScheduledQueryInputType } from './components/input_type';
import { ScheduledQueryPackSelector } from './components/pack_selector';
import { ScheduledQueryQueriesTable } from './components/scheduled_queries_table';
import { AddNewQueryFlyout } from './components/add_new_query_flyout';

const queryClient = new QueryClient();

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const OsqueryManagedPolicyCreateExtension = React.memo<PackagePolicyCreateExtensionComponentProps>(
  ({ onChange, newPolicy }) => {
    const [showAddQueryFlyout, setShowAddQueryFlyout] = useState(false);

    const handleShowFlyout = useCallback(() => setShowAddQueryFlyout(true), []);
    const handleHideFlyout = useCallback(() => setShowAddQueryFlyout(false), []);

    return (
      <QueryClientProvider client={queryClient}>
        <ScheduledQueryInputType data={newPolicy} handleChange={onChange} />
        {newPolicy.inputs[0].config?.input_source?.value === 'pack' && (
          <ScheduledQueryPackSelector data={newPolicy} handleChange={onChange} />
        )}
        {newPolicy.inputs[0].streams.length && (
          // @ts-expect-error update types
          <ScheduledQueryQueriesTable data={newPolicy} handleChange={onChange} />
        )}
        {newPolicy.inputs[0].config?.input_source?.value !== 'pack' && (
          <EuiButton fill onClick={handleShowFlyout}>
            {'Attach next query'}
          </EuiButton>
        )}
        {showAddQueryFlyout && (
          <AddNewQueryFlyout data={newPolicy} handleChange={onChange} onClose={handleHideFlyout} />
        )}
      </QueryClientProvider>
    );
  }
);
OsqueryManagedPolicyCreateExtension.displayName = 'OsqueryManagedPolicyCreateExtension';
