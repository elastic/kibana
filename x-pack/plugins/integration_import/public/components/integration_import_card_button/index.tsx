/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { IntegrationImportCardButtonComponent } from './types';

const IntegrationImportCardButton = React.lazy(() =>
  import('./integration_import_card_button').then((module) => ({
    default: module.IntegrationImportCardButton,
  }))
);

export const getIntegrationImportCardButtonLazy = (): IntegrationImportCardButtonComponent =>
  React.memo(function IntegrationImportCardButtonLazy(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        <IntegrationImportCardButton {...props} />
      </Suspense>
    );
  });
