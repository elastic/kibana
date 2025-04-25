/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { InspectorContextProvider } from '@kbn/observability-shared-plugin/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { KibanaThemeProvider } from '@kbn/react-kibana-context-theme';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { Router } from '@kbn/shared-ux-router';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { kibanaService } from '../../utils/kibana_service';
import { ActionMenu } from './components/common/header/action_menu';
import { TestNowModeFlyoutContainer } from './components/test_now_mode/test_now_mode_flyout_container';
import {
  SyntheticsAppProps,
  SyntheticsRefreshContextProvider,
  SyntheticsSettingsContextProvider,
  SyntheticsStartupPluginsContextProvider,
  SyntheticsThemeContextProvider,
} from './contexts';
import { SyntheticsDataViewContextProvider } from './contexts/synthetics_data_view_context';
import { PageRouter } from './routes';
import { setBasePath, storage, store } from './state';

const Application = (props: SyntheticsAppProps) => {
  const {
    basePath,
    canSave,
    core,
    darkMode,
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
    <KibanaRenderContextProvider {...core}>
      <KibanaThemeProvider
        theme={core.theme}
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
              observabilityShared: startPlugins.observabilityShared,
              observabilityAIAssistant: startPlugins.observabilityAIAssistant,
              exploratoryView: startPlugins.exploratoryView,
              cases: startPlugins.cases,
              spaces: startPlugins.spaces,
              fleet: startPlugins.fleet,
              unifiedSearch: startPlugins.unifiedSearch,
            }}
          >
            <SyntheticsDataViewContextProvider dataViews={startPlugins.dataViews}>
              <Router history={appMountParameters.history}>
                <EuiThemeProvider darkMode={darkMode}>
                  <SyntheticsRefreshContextProvider>
                    <SyntheticsSettingsContextProvider {...props}>
                      <SyntheticsThemeContextProvider darkMode={darkMode}>
                        <SyntheticsStartupPluginsContextProvider {...startPlugins}>
                          <PerformanceContextProvider>
                            <div className={APP_WRAPPER_CLASS} data-test-subj="syntheticsApp">
                              <RedirectAppLinks
                                coreStart={{
                                  application: core.application,
                                }}
                              >
                                <InspectorContextProvider>
                                  <PageRouter />
                                  <ActionMenu appMountParameters={appMountParameters} />
                                  <TestNowModeFlyoutContainer />
                                </InspectorContextProvider>
                              </RedirectAppLinks>
                            </div>
                          </PerformanceContextProvider>
                        </SyntheticsStartupPluginsContextProvider>
                      </SyntheticsThemeContextProvider>
                    </SyntheticsSettingsContextProvider>
                  </SyntheticsRefreshContextProvider>
                </EuiThemeProvider>
              </Router>
            </SyntheticsDataViewContextProvider>
          </KibanaContextProvider>
        </ReduxProvider>
      </KibanaThemeProvider>
    </KibanaRenderContextProvider>
  );
};

export const SyntheticsApp = (props: SyntheticsAppProps) => <Application {...props} />;
