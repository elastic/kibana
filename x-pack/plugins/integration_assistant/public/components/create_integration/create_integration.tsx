/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CreateIntegrationLanding } from './create_integration_landing';
import { CreateIntegrationUpload } from './create_integration_upload';
import { CreateIntegrationSuccess } from './create_integration_success';
import { IntegrationAssistant as CreateIntegrationAssistant } from './integration_assistant';
import type { Page, SetIntegrationName, SetPage } from '../types';
import { Pages } from '../constants';

const getPageFromHash = (hash: string): Page | null => {
  if (!hash) {
    return null;
  }
  const rawPage = hash.replace('#', '') as Page;
  if (Pages.includes(rawPage)) {
    return rawPage;
  }
  return null;
};

export const CreateIntegration = React.memo(() => {
  const [pageState, setPageState] = useState<Page>();
  const { hash } = useLocation();

  useEffect(() => {
    const page = getPageFromHash(hash);
    setPageState(page || 'landing');
  }, [hash, setPageState]);

  const setIntegrationName = useCallback<SetIntegrationName>((integrationName?: string) => {
    const params = new URLSearchParams(location.search);
    if (integrationName) {
      params.set('integration_name', integrationName);
    } else {
      params.delete('integration_name');
    }
    history.pushState('', '', `?${params.toString()}`);
  }, []);

  const setPage = useCallback<SetPage>((page) => {
    location.hash = page === 'landing' ? '' : page;
  }, []);

  switch (pageState) {
    case 'landing':
      return <CreateIntegrationLanding setPage={setPage} />;
    case 'upload':
      return <CreateIntegrationUpload setPage={setPage} setIntegrationName={setIntegrationName} />;
    case 'assistant':
      return <CreateIntegrationAssistant setPage={setPage} />;
    case 'success':
      return <CreateIntegrationSuccess setPage={setPage} />;
    default:
      return null;
  }
});
CreateIntegration.displayName = 'CreateIntegration';
