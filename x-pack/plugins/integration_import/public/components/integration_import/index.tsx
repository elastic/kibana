/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { Services } from '../../services';
import type { IntegrationImportComponent } from './types';

const IntegrationImport = React.lazy(() =>
  import('./integration_import').then((module) => ({
    default: module.IntegrationImport,
  }))
);

export const getIntegrationImportLazy = (services: Services): IntegrationImportComponent =>
  React.memo(function IntegrationImportLazy() {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <IntegrationImport services={services} />
      </Suspense>
    );
  });
