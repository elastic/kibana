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
import { I18nStart, ChromeBreadcrumb, CoreStart, AppMountParameters } from '@kbn/core/public';
import { APP_WRAPPER_CLASS } from '@kbn/core/public';
import {
  KibanaContextProvider,
  KibanaThemeProvider,
  RedirectAppLinks,
} from '@kbn/kibana-react-plugin/public';
import { EuiThemeProvider } from '@kbn/kibana-react-plugin/common';
import { InspectorContextProvider } from '@kbn/observability-plugin/public';
import { ClientPluginsSetup, ClientPluginsStart } from '../../plugin';
import { UMUpdateBadge } from '../lib/lib';
import {
  UptimeRefreshContextProvider,
  UptimeSettingsContextProvider,
  UptimeThemeContextProvider,
  UptimeStartupPluginsContextProvider,
} from '../contexts';
import { CommonlyUsedRange } from '../components/common/uptime_date_picker';
import { setBasePath } from '../state/actions';
import { PageRouter } from '../routes';
import { UptimeAlertsFlyoutWrapper } from '../components/overview';
import { store, storage } from '../state';
import { kibanaService } from '../state/kibana_service';
import { ActionMenu } from '../components/common/header/action_menu';
import { UptimeDataViewContextProvider } from '../contexts/uptime_data_view_context';

export interface UptimeAppColors {
  danger: string;
  dangerBehindText: string;
  success: string;
  gray: string;
  range: string;
  mean: string;
  warning: string;
  lightestShade: string;
}

export interface UptimeAppProps {
  basePath: string;
  canSave: boolean;
  core: CoreStart;
  darkMode: boolean;
  i18n: I18nStart;
  isApmAvailable: boolean;
  isInfraAvailable: boolean;
  isLogsAvailable: boolean;
  plugins: ClientPluginsSetup;
  startPlugins: ClientPluginsStart;
  setBadge: UMUpdateBadge;
  renderGlobalHelpControls(): void;
  commonlyUsedRanges: CommonlyUsedRange[];
  setBreadcrumbs: (crumbs: ChromeBreadcrumb[]) => void;
  appMountParameters: AppMountParameters;
  isDev: boolean;
}

const Application = (props: UptimeAppProps) => {
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
                fleet: startPlugins.fleet,
                inspector: startPlugins.inspector,
                triggersActionsUi: startPlugins.triggersActionsUi,
                observability: startPlugins.observability,
                cases: startPlugins.cases,
              }}
            >
              <Router history={appMountParameters.history}>
                <EuiThemeProvider darkMode={darkMode}>
                  <UptimeRefreshContextProvider>
                    <UptimeSettingsContextProvider {...props}>
                      <UptimeThemeContextProvider darkMode={darkMode}>
                        <UptimeStartupPluginsContextProvider {...startPlugins}>
                          <UptimeDataViewContextProvider dataViews={startPlugins.dataViews}>
                            <div className={APP_WRAPPER_CLASS} data-test-subj="uptimeApp">
                              <RedirectAppLinks
                                className={APP_WRAPPER_CLASS}
                                application={core.application}
                              >
                                <InspectorContextProvider>
                                  <UptimeAlertsFlyoutWrapper />
                                  <PageRouter />
                                  <ActionMenu appMountParameters={appMountParameters} />
                                </InspectorContextProvider>
                              </RedirectAppLinks>
                            </div>
                          </UptimeDataViewContextProvider>
                        </UptimeStartupPluginsContextProvider>
                      </UptimeThemeContextProvider>
                    </UptimeSettingsContextProvider>
                  </UptimeRefreshContextProvider>
                </EuiThemeProvider>
              </Router>
            </KibanaContextProvider>
          </ReduxProvider>
        </KibanaThemeProvider>
      </i18nCore.Context>
    </EuiErrorBoundary>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
