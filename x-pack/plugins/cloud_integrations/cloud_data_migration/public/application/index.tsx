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
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { BreadcrumbService } from './services/breadcrumbs';
import { CloudDataMigrationApp } from './components/app';

export const renderApp = (
  core: CoreStart,
  breadcrumbService: BreadcrumbService,
  { element }: ManagementAppMountParams
) => {
  ReactDOM.render(
    <KibanaRenderContextProvider {...core}>
      <KibanaContextProvider
        services={{
          breadcrumbService,
        }}
      >
        <CloudDataMigrationApp http={core.http} breadcrumbService={breadcrumbService} />
      </KibanaContextProvider>
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
