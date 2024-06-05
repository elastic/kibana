/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback } from 'react';
import { CreateIntegrationLanding } from './create_integration_landing';
import { CreateIntegrationUpload } from './create_integration_upload';
import { CreateIntegrationSuccess } from './create_integration_success';
import { IntegrationAssistant as CreateIntegrationAssistant } from './integration_assistant';
import type { Page, SetPage } from '../types';

export const CreateIntegration = React.memo(() => {
  const [pageState, setPageState] = useState<Page>('landing');

  const setPage = useCallback<SetPage>((page: Page) => {
    setPageState(page);
  }, []);

  switch (pageState) {
    case 'landing':
      return <CreateIntegrationLanding setPage={setPage} />;
    case 'upload':
      return <CreateIntegrationUpload setPage={setPage} />;
    case 'assistant':
      return <CreateIntegrationAssistant setPage={setPage} />;
    case 'success':
      return <CreateIntegrationSuccess setPage={setPage} />;
    default:
      return null;
  }
});
CreateIntegration.displayName = 'CreateIntegration';
