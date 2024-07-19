/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useStartServices, useBreadcrumbs } from '../../../../hooks';

export const ImportIntegrations = React.memo(() => {
  const { integrationImport } = useStartServices();
  useBreadcrumbs('integration_create');

  const ImportIntegrationsComponent = integrationImport?.components.CreateIntegration;

  return ImportIntegrationsComponent ? <ImportIntegrationsComponent /> : null;
});
