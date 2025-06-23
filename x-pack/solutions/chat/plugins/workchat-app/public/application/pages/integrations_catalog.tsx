/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IntegrationCatalogView } from '../components/integrations/listing/integration_catalog_view';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';

export const WorkChatCatalogPage: React.FC = () => {
  useBreadcrumb([{ text: 'Tools' }]);
  return <IntegrationCatalogView />;
};
