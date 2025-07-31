/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumb } from '../hooks/use_breadcrumbs';
import { DataSourcesCatalogView } from '../components/data_sources/data_sources_catalog_view';

export const DataSourcesPage: React.FC<{}> = () => {
  useBreadcrumb([
    {
      text: 'Data Sources',
    },
  ]);

  return <DataSourcesCatalogView />;
};
