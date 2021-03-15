/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClientProvider, QueryClient } from 'react-query';

import { LiveQuery } from '../../live_query';

// @ts-expect-error update types
const CreateOsqueryActionFormComponent = (props) => <LiveQuery {...props} />;

export const CreateOsqueryActionForm = React.memo(CreateOsqueryActionFormComponent);

const queryClient = new QueryClient();

// @ts-expect-error update types
const CreateOsqueryActionFormWrapperComponent = (props) => (
  <QueryClientProvider client={queryClient}>
    <CreateOsqueryActionForm {...props} />
  </QueryClientProvider>
);

const CreateOsqueryActionFormWrapper = React.memo(CreateOsqueryActionFormWrapperComponent);

// eslint-disable-next-line import/no-default-export
export { CreateOsqueryActionFormWrapper as default };
