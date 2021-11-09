/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteRenderer, RouterProvider } from '@kbn/typed-react-router-config';
import React from 'react';
import { Route } from 'react-router-dom';
import {
  APP_WRAPPER_CLASS,
  AppMountParameters,
  CoreStart,
} from '../../../../../../src/core/public';
import { EuiThemeProvider } from '../../../../../../src/plugins/kibana_react/common';
import {
  RedirectAppLinks,
  useUiSetting$,
} from '../../../../../../src/plugins/kibana_react/public';
import {
  HeaderMenuPortal,
  InspectorContextProvider,
} from '../../../../observability/public';
import { ScrollToTopOnPathChange } from '../../components/app/Main/ScrollToTopOnPathChange';
import { AnomalyDetectionJobsContextProvider } from '../../context/anomaly_detection_jobs/anomaly_detection_jobs_context';
import { ApmPluginContext } from '../../context/apm_plugin/apm_plugin_context';
import { BreadcrumbsContextProvider } from '../../context/breadcrumbs/context';
import { LicenseProvider } from '../../context/license/license_context';
import { TimeRangeIdContextProvider } from '../../context/time_range_id/time_range_id_context';
import { UrlParamsProvider } from '../../context/url_params_context/url_params_context';
import { ApmHeaderActionMenu } from '../shared/apm_header_action_menu';
import { RedirectWithDefaultDateRange } from '../shared/redirect_with_default_date_range';
import type { ConfigSchema } from '../../';
import { apmRouter } from './apm_route_config';
import { TrackPageview } from './track_pageview';
import type { ApmPluginSetupDeps, ApmPluginStartDeps } from '../../plugin';
import { KibanaConfigContext } from '../../context/kibana_config/kibana_config_context';
import { KibanaServicesContextProvider } from '../../context/kibana_services/kibana_services_context';

export interface ApmAppRootProps {
  appMountParameters: AppMountParameters;
  config: ConfigSchema;
  coreStart: CoreStart;
  pluginsSetup: ApmPluginSetupDeps;
  pluginsStart: ApmPluginStartDeps;
}

export function ApmAppRoot({
  appMountParameters,
  config,
  coreStart,
  pluginsSetup,
  pluginsStart,
}: ApmAppRootProps) {
  const { history, setHeaderActionMenu } = appMountParameters;
  const I18nContextProvider = coreStart.i18n.Context;

  return (
    <RedirectAppLinks
      application={coreStart.application}
      className={APP_WRAPPER_CLASS}
      data-test-subj="apmMainContainer"
      role="main"
    >
      <KibanaConfigContext.Provider value={config}>
        <ApmPluginContext.Provider value={{ pluginsSetup, pluginsStart }}>
          <KibanaServicesContextProvider
            value={{
              ...coreStart,
              triggersActionsUi: pluginsStart.triggersActionsUi,
            }}
          >
            <I18nContextProvider>
              <TimeRangeIdContextProvider>
                <RouterProvider history={history} router={apmRouter as any}>
                  <RedirectWithDefaultDateRange>
                    <TrackPageview>
                      <BreadcrumbsContextProvider>
                        <UrlParamsProvider>
                          <LicenseProvider>
                            <AnomalyDetectionJobsContextProvider>
                              <InspectorContextProvider>
                                <ApmThemeProvider>
                                  <HeaderMenuPortal
                                    setHeaderActionMenu={setHeaderActionMenu}
                                  >
                                    <ApmHeaderActionMenu />
                                  </HeaderMenuPortal>
                                  <Route component={ScrollToTopOnPathChange} />
                                  <RouteRenderer />
                                </ApmThemeProvider>
                              </InspectorContextProvider>
                            </AnomalyDetectionJobsContextProvider>
                          </LicenseProvider>
                        </UrlParamsProvider>
                      </BreadcrumbsContextProvider>
                    </TrackPageview>
                  </RedirectWithDefaultDateRange>
                </RouterProvider>
              </TimeRangeIdContextProvider>
            </I18nContextProvider>
          </KibanaServicesContextProvider>
        </ApmPluginContext.Provider>
      </KibanaConfigContext.Provider>
    </RedirectAppLinks>
  );
}

function ApmThemeProvider({ children }: { children: React.ReactNode }) {
  const [darkMode] = useUiSetting$<boolean>('theme:darkMode');

  return <EuiThemeProvider darkMode={darkMode}>{children}</EuiThemeProvider>;
}
