/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { merge } from 'lodash';
import { LocationDescriptorObject } from 'history';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { HttpSetup } from '@kbn/core/public';
import { coreMock, scopedHistoryMock } from '@kbn/core/public/mocks';
import { setUiMetricService, httpService } from '../../../public/application/services/http';
import {
  breadcrumbService,
  docTitleService,
} from '../../../public/application/services/navigation';
import {
  AuthorizationContext,
  Authorization,
  Privileges,
  GlobalFlyout,
} from '../../../public/shared_imports';
import { AppContextProvider } from '../../../public/application/app_context';
import { textService } from '../../../public/application/services/text';
import { init as initHttpRequests } from './http_requests';
import { UiMetricService } from '../../../public/application/services';

const { GlobalFlyoutProvider } = GlobalFlyout;
const history = scopedHistoryMock.create();
history.createHref.mockImplementation((location: LocationDescriptorObject) => {
  return `${location.pathname}?${location.search}`;
});

const createAuthorizationContextValue = (privileges: Privileges) => {
  return {
    isLoading: false,
    privileges: privileges ?? { hasAllPrivileges: false, missingPrivileges: {} },
  } as Authorization;
};

export const services = {
  uiMetricService: new UiMetricService('snapshot_restore'),
  httpService,
  i18n,
  history,
};

setUiMetricService(services.uiMetricService);

const core = coreMock.createStart();

const appDependencies = {
  core,
  services,
  config: {
    slm_ui: { enabled: true },
  },
  plugins: {},
};

const kibanaContextDependencies = {
  uiSettings: core.uiSettings,
  settings: core.settings,
  theme: core.theme,
};

export const setupEnvironment = () => {
  breadcrumbService.setup(() => undefined);
  textService.setup(i18n);
  docTitleService.setup(() => undefined);

  return initHttpRequests();
};

/**
 * Suppress error messages about Worker not being available in JS DOM.
 */
(window as any).Worker = function Worker() {
  this.postMessage = () => {};
  this.terminate = () => {};
};

export const WithAppDependencies =
  (Comp: any, httpSetup?: HttpSetup, { privileges, ...overrides }: Record<string, unknown> = {}) =>
  (props: any) => {
    // We need to optionally setup the httpService since some cit helpers (such as snapshot_list.helpers)
    // use jest mocks to stub the fetch hooks instead of mocking api responses.
    if (httpSetup) {
      httpService.setup(httpSetup);
    }

    return (
      <AuthorizationContext.Provider
        value={createAuthorizationContextValue(privileges as Privileges)}
      >
        <KibanaContextProvider services={kibanaContextDependencies}>
          <AppContextProvider value={merge(appDependencies, overrides) as any}>
            <GlobalFlyoutProvider>
              <Comp {...props} />
            </GlobalFlyoutProvider>
          </AppContextProvider>
        </KibanaContextProvider>
      </AuthorizationContext.Provider>
    );
  };
