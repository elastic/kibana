/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { Services } from '../../services';
import type { CreateIntegrationComponent } from './types';

const CreateIntegration = React.lazy(() =>
  import('./create_integration').then((module) => ({
    default: module.CreateIntegration,
  }))
);

export const getCreateIntegrationLazy = (services: Services): CreateIntegrationComponent =>
  React.memo(function CreateIntegrationLazy() {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <CreateIntegration services={services} />
      </Suspense>
    );
  });
