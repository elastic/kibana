/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Router } from 'react-router-dom';
import { EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { InspectorContextProvider } from '@kbn/observability-plugin/public';
import { SyntheticsAppProps, SyntheticsDataViewContextProvider } from './contexts';

import {
  SyntheticsRefreshContextProvider,
  SyntheticsSettingsContextProvider,
  SyntheticsThemeContextProvider,
  SyntheticsStartupPluginsContextProvider,
} from './contexts';

import { PageRouter } from './routes';
import { store, storage, setBasePath } from './state';
import { kibanaService } from '../../utils/kibana_service';
import { ActionMenu } from './components/common/header/action_menu';
import { TestNowModeFlyoutContainer } from './components/test_now_mode/test_now_mode_flyout_container';

const Application = (props: SyntheticsAppProps) => {
  const {
    basePath,
    canSave,
    core,
    darkMode,
    i18n: i18nCore,
    plugins,
    renderGlobalHelpControls,
    setBadge,
    startPlugins,
    appMountParameters,
  } = props;

  useEffect(() => {
    renderGlobalHelpControls();
    setBadge(
      !canSave
        ? {
            text: i18n.translate('xpack.synthetics.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.synthetics.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [canSave, renderGlobalHelpControls, setBadge]);

  kibanaService.core = core;
  kibanaService.startPlugins = startPlugins;
  kibanaService.theme = props.appMountParameters.theme$;

  store.dispatch(setBasePath(basePath));

  return (
    <EuiErrorBoundary>
      <i18nCore.Context>
        <KibanaThemeProvider
          theme$={props.appMountParameters.theme$}
          modify={{
            breakpoint: {
              xxl: 1600,
              xxxl: 2000,
            },
          }}
        >
          <ReduxProvider store={store}>
            <KibanaContextProvider
              services={{
                ...core,
                ...plugins,
                storage,
                data: startPlugins.data,
                inspector: startPlugins.inspector,
                triggersActionsUi: startPlugins.triggersActionsUi,
                observability: startPlugins.observability,
                cases: startPlugins.cases,
                spaces: startPlugins.spaces,
                fleet: startPlugins.fleet,
              }}
            >
              <Router history={appMountParameters.history}>
                <EuiThemeProvider darkMode={darkMode}>
                  <SyntheticsRefreshContextProvider>
                    <SyntheticsSettingsContextProvider {...props}>
                      <SyntheticsDataViewContextProvider dataViews={startPlugins.dataViews}>
                        <SyntheticsThemeContextProvider darkMode={darkMode}>
                          <SyntheticsStartupPluginsContextProvider {...startPlugins}>
                            <div className={APP_WRAPPER_CLASS} data-test-subj="syntheticsApp">
                              <RedirectAppLinks
                                className={APP_WRAPPER_CLASS}
                                application={core.application}
                              >
                                <InspectorContextProvider>
                                  <PageRouter />
                                  <ActionMenu appMountParameters={appMountParameters} />
                                  <TestNowModeFlyoutContainer />
                                </InspectorContextProvider>
                              </RedirectAppLinks>
                            </div>
                          </SyntheticsStartupPluginsContextProvider>
                        </SyntheticsThemeContextProvider>
                      </SyntheticsDataViewContextProvider>
                    </SyntheticsSettingsContextProvider>
                  </SyntheticsRefreshContextProvider>
                </EuiThemeProvider>
              </Router>
            </KibanaContextProvider>
          </ReduxProvider>
        </KibanaThemeProvider>
      </i18nCore.Context>
    </EuiErrorBoundary>
  );
};

export const SyntheticsApp = (props: SyntheticsAppProps) => <Application {...props} />;
