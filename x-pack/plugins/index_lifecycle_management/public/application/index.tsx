/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { ScopedHistory, ApplicationStart, UnmountCallback, CoreStart } from '@kbn/core/public';
import { DocLinksStart, ExecutionContextStart } from '@kbn/core/public';
import { AirdropKibanaProvider } from '@kbn/airdrops';
import type { AirdropPluginStart } from '@kbn/airdrop-plugin/public';

import {
  CloudSetup,
  ILicense,
  KibanaContextProvider,
  APP_WRAPPER_CLASS,
  KibanaRenderContextProvider,
  RedirectAppLinks,
} from '../shared_imports';
import { App } from './app';
import { BreadcrumbService } from './services/breadcrumbs';

export const renderApp = (
  startServices: CoreStart,
  element: Element,
  history: ScopedHistory,
  application: ApplicationStart,
  breadcrumbService: BreadcrumbService,
  license: ILicense,
  docLinks: DocLinksStart,
  executionContext: ExecutionContextStart,
  airdrop: AirdropPluginStart,
  cloud?: CloudSetup
): UnmountCallback => {
  const { navigateToUrl, getUrlForApp } = application;
  const { overlays, http } = startServices;

  render(
    <KibanaRenderContextProvider {...startServices}>
      <div className={APP_WRAPPER_CLASS}>
        <RedirectAppLinks
          coreStart={{
            application,
          }}
        >
          <KibanaContextProvider
            services={{
              cloud,
              breadcrumbService,
              license,
              getUrlForApp,
              docLinks,
              executionContext,
              navigateToUrl,
              overlays,
              http,
              history,
            }}
          >
            <AirdropKibanaProvider airdrop={airdrop}>
              <App history={history} />
            </AirdropKibanaProvider>
          </KibanaContextProvider>
        </RedirectAppLinks>
      </div>
    </KibanaRenderContextProvider>,
    element
  );

  return () => unmountComponentAtNode(element);
};
