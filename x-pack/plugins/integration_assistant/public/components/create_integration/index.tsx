/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { CreateIntegrationServices } from './types';

const CreateIntegration = React.lazy(() =>
  import('./create_integration').then((module) => ({
    default: module.CreateIntegration,
  }))
);
const CreateIntegrationContext = React.lazy(() =>
  import('./create_integration_context').then((module) => ({
    default: module.CreateIntegrationContext,
  }))
);

export const getCreateIntegrationLazy = (services: CreateIntegrationServices) =>
  React.memo(function CreateIntegrationLazy() {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <CreateIntegrationContext services={services}>
          <CreateIntegration />
        </CreateIntegrationContext>
      </Suspense>
    );
  });
