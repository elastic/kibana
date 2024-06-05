/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useStartServices, useBreadcrumbs } from '../../../../hooks';

export const CreateIntegration = React.memo(() => {
  const { integrationAssistant } = useStartServices();
  useBreadcrumbs('integration_create');

  const CreateIntegrationAssistant = useMemo(
    () => integrationAssistant?.CreateIntegration,
    [integrationAssistant]
  );

  return CreateIntegrationAssistant ? <CreateIntegrationAssistant /> : null;
});
