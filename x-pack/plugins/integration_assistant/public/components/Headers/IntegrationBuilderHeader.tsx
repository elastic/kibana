/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageTemplate } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import IntegrationBuilderSteps from '../IntegrationBuilderSteps/IntegrationBuilderSteps';
import ProgressPortal from '../Portal/ProgressPortal';
import { useGlobalStore } from '@Stores/useGlobalStore';
import HeaderTitles from '../../constants/headerTitles';

export const IntegrationBuilderHeader = () => {
  const location = useLocation();
  const isPortalLoading = useGlobalStore((state) => state.isPortalLoading);
  const pageTitle = HeaderTitles[location.pathname as keyof typeof HeaderTitles] || 'Unknown Page';
  return (
    <>
      <EuiPageTemplate.Header pageTitle={pageTitle} />
      {pageTitle && pageTitle !== 'Base Page' && <IntegrationBuilderSteps />}
      {isPortalLoading && <ProgressPortal />}
    </>
  );
};
