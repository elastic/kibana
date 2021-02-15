/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { PackagePolicyCreateExtensionComponentProps } from '../../../fleet/public';
// import { InputStreamForm } from './components/input_stream_form';
import { EditScheduledQueryForm } from './components/form';

const queryClient = new QueryClient();

/**
 * Exports Osquery-specific package policy instructions
 * for use in the Fleet app create / edit package policy
 */
export const OsqueryManagedPolicyCreateExtension = memo<PackagePolicyCreateExtensionComponentProps>(
  (props) => {
    // console.error('rpops', props);

    return (
      <QueryClientProvider client={queryClient}>
        {
          // @ts-expect-error update types
          <EditScheduledQueryForm data={props.policy} handleChange={props.onChange} />
        }
      </QueryClientProvider>
    );
  }
);
OsqueryManagedPolicyCreateExtension.displayName = 'OsqueryManagedPolicyCreateExtension';
