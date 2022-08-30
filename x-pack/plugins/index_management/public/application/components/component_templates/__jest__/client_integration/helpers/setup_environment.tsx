/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CoreStart, HttpSetup } from '@kbn/core/public';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { executionContextServiceMock } from '@kbn/core-execution-context-browser-mocks';
import { notificationServiceMock, applicationServiceMock, coreMock } from '@kbn/core/public/mocks';
import { GlobalFlyout } from '@kbn/es-ui-shared-plugin/public';

import { AppContextProvider } from '../../../../../app_context';
import { MappingsEditorProvider } from '../../../../mappings_editor';
import { ComponentTemplatesProvider } from '../../../component_templates_context';

import { init as initHttpRequests } from './http_requests';
import { API_BASE_PATH } from './constants';

const { GlobalFlyoutProvider } = GlobalFlyout;

// We provide the minimum deps required to make the tests pass
const appDependencies = {
  docLinks: {} as any,
} as any;

export const componentTemplatesDependencies = (httpSetup: HttpSetup, coreStart?: CoreStart) => ({
  overlays: coreStart?.overlays ?? coreMock.createStart().overlays,
  httpClient: httpSetup,
  apiBasePath: API_BASE_PATH,
  trackMetric: () => {},
  docLinks: docLinksServiceMock.createStartContract(),
  toasts: notificationServiceMock.createSetupContract().toasts,
  setBreadcrumbs: () => {},
  getUrlForApp: applicationServiceMock.createStartContract().getUrlForApp,
  executionContext: executionContextServiceMock.createInternalStartContract(),
});

export const setupEnvironment = initHttpRequests;

export const WithAppDependencies =
  (Comp: any, httpSetup: HttpSetup, coreStart?: CoreStart) => (props: any) =>
    (
      <AppContextProvider value={appDependencies}>
        <MappingsEditorProvider>
          <ComponentTemplatesProvider value={componentTemplatesDependencies(httpSetup, coreStart)}>
            <GlobalFlyoutProvider>
              <Comp {...props} />
            </GlobalFlyoutProvider>
          </ComponentTemplatesProvider>
        </MappingsEditorProvider>
        /
      </AppContextProvider>
    );
