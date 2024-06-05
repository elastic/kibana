/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense } from 'react';
import type { IntegrationAssistantServices } from '../../types';
import type { CreateIntegrationCardButtonProps } from './create_integration_card_button';

const CreateIntegrationCardButton = React.lazy(() =>
  import('./create_integration_card_button').then((module) => ({
    default: module.CreateIntegrationCardButton,
  }))
);
// const IntegrationAssistantContext = React.lazy(() =>
//   import('./integration_assistant_context').then((module) => ({
//     default: module.IntegrationAssistantContext,
//   }))
// );

export const getCreateIntegrationCardButtonLazy = (services: IntegrationAssistantServices) =>
  React.memo(function CreateIntegrationCardButtonLazy(props: CreateIntegrationCardButtonProps) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="l" />}>
        {/* <IntegrationAssistantContext services={services}> */}
        <CreateIntegrationCardButton {...props} />
        {/* </IntegrationAssistantContext> */}
      </Suspense>
    );
  });
