/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { CoreStart } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { CloudDataMigrationApp } from './components/app';
import { BreadcrumbService } from './services/breadcrumbs';

export const renderApp = (
  { http }: CoreStart,
  breadcrumbService: BreadcrumbService,
  { element, theme$ }: ManagementAppMountParams
) => {
  ReactDOM.render(
    <CloudDataMigrationApp http={http} theme$={theme$} breadcrumbService={breadcrumbService} />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
