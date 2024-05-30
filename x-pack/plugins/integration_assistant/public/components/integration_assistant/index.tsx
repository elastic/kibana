/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import { IntegrationAssistantServices } from '../../types';

const IntegrationAssistant = React.lazy(() =>
  import('./integration_assistant').then((module) => ({
    default: module.IntegrationAssistant,
  }))
);
const IntegrationAssistantContext = React.lazy(() =>
  import('./integration_assistant_context').then((module) => ({
    default: module.IntegrationAssistantContext,
  }))
);

export const getIntegrationAssistantLazy = (services: IntegrationAssistantServices) => (
  <Suspense fallback={<EuiLoadingSpinner size="l" />}>
    <IntegrationAssistantContext services={services}>
      <IntegrationAssistant />
    </IntegrationAssistantContext>
  </Suspense>
);
