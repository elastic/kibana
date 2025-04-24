/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { useIntegrationList } from '../hooks/use_integration_list';
import { IntegrationListView } from '../components/integrations/listing/integration_list_view';

export const WorkChatIntegrationsPage: React.FC<{}> = () => {
  useBreadcrumb([{ text: 'Integrations' }]);
  const { integrations } = useIntegrationList();
  return <IntegrationListView integrations={integrations} />;
};
