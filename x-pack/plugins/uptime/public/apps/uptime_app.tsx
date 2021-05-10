/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { Router } from 'react-router-dom';
import styled from 'styled-components';
import { EuiPage, EuiErrorBoundary } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { I18nStart, ChromeBreadcrumb, CoreStart, AppMountParameters } from 'kibana/public';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../../src/plugins/kibana_react/public';
import { ClientPluginsSetup, ClientPluginsStart } from './plugin';
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
import { UptimeAlertsFlyoutWrapper } from '../components/overview/alerts';
import { store } from '../state';
import { kibanaService } from '../state/kibana_service';
import { ActionMenu } from '../components/common/header/action_menu';
import { EuiThemeProvider } from '../../../../../src/plugins/kibana_react/common';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';

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
}

const StyledPage = styled(EuiPage)`
  display: flex;
  flex-grow: 1;
  flex-shrink: 0;
  flex-basis: auto;
  flex-direction: column;

  > * {
    flex-shrink: 0;
  }
`;

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
            text: i18n.translate('xpack.uptime.badge.readOnly.text', {
              defaultMessage: 'Read only',
            }),
            tooltip: i18n.translate('xpack.uptime.badge.readOnly.tooltip', {
              defaultMessage: 'Unable to save',
            }),
            iconType: 'glasses',
          }
        : undefined
    );
  }, [canSave, renderGlobalHelpControls, setBadge]);

  kibanaService.core = core;

  store.dispatch(setBasePath(basePath));

  const storage = new Storage(window.localStorage);

  return (
    <EuiErrorBoundary>
      <i18nCore.Context>
        <ReduxProvider store={store}>
          <KibanaContextProvider
            services={{
              ...core,
              ...plugins,
              storage,
              data: startPlugins.data,
              triggersActionsUi: startPlugins.triggersActionsUi,
            }}
          >
            <Router history={appMountParameters.history}>
              <EuiThemeProvider darkMode={darkMode}>
                <UptimeRefreshContextProvider>
                  <UptimeSettingsContextProvider {...props}>
                    <UptimeThemeContextProvider darkMode={darkMode}>
                      <UptimeStartupPluginsContextProvider {...startPlugins}>
                        <StyledPage data-test-subj="uptimeApp">
                          <RedirectAppLinks application={core.application}>
                            <main>
                              <UptimeAlertsFlyoutWrapper />
                              <PageRouter />
                              <ActionMenu appMountParameters={appMountParameters} />
                            </main>
                          </RedirectAppLinks>
                        </StyledPage>
                      </UptimeStartupPluginsContextProvider>
                    </UptimeThemeContextProvider>
                  </UptimeSettingsContextProvider>
                </UptimeRefreshContextProvider>
              </EuiThemeProvider>
            </Router>
          </KibanaContextProvider>
        </ReduxProvider>
      </i18nCore.Context>
    </EuiErrorBoundary>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
