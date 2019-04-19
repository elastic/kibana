/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore missing typings for EuiHeaderLink
  EuiHeaderLink,
  // @ts-ignore missing typings for EuiHeaderLinks
  EuiHeaderLogo,
  // @ts-ignore missing typings for EuiHeaderLogo
  EuiHeaderSectionItem,
  // @ts-ignore missing typings for EuiHeaderSectionItem
  EuiPage,
  EuiSpacer,
  // @ts-ignore missing typings for EuiSuperDatePicker
  EuiSuperDatePicker,
  EuiTitle,
} from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import React, { useEffect, useState } from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { overviewBreadcrumb, UMBreadcrumb } from './breadcrumbs';
import { UMGraphQLClient, UMUpdateBreadcrumbs } from './lib/lib';
import { MonitorPage, OverviewPage } from './pages';
import { UptimeRefreshContext, UptimeSettingsContext } from './contexts';
import { UptimeDatePicker } from './components/functional/uptime_date_picker';
import { useUrlParams } from './hooks';

export interface UptimeAppColors {
  danger: string;
  success: string;
  range: string;
  mean: string;
}

export interface UptimeAppProps {
  basePath: string;
  darkMode: boolean;
  client: UMGraphQLClient;
  kibanaBreadcrumbs: UMBreadcrumb[];
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  renderGlobalHelpControls(): void;
}

const Application = (props: UptimeAppProps) => {
  const {
    basePath,
    client,
    darkMode,
    renderGlobalHelpControls,
    routerBasename,
    setBreadcrumbs,
  } = props;

  let colors: UptimeAppColors;
  if (darkMode) {
    colors = {
      success: euiDarkVars.euiColorSuccess,
      range: euiDarkVars.euiFocusBackgroundColor,
      mean: euiDarkVars.euiColorPrimary,
      danger: euiDarkVars.euiColorDanger,
    };
  } else {
    colors = {
      success: euiLightVars.euiColorSuccess,
      range: euiLightVars.euiFocusBackgroundColor,
      mean: euiLightVars.euiColorPrimary,
      danger: euiLightVars.euiColorDanger,
    };
  }

  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  const [headingText, setHeadingText] = useState<string | undefined>(undefined);

  useEffect(() => {
    setBreadcrumbs([overviewBreadcrumb]);
    renderGlobalHelpControls();
  }, []);

  const refreshApp = () => {
    setLastRefresh(Date.now());
  };

  return (
    <I18nContext>
      <Router basename={routerBasename}>
        <Route
          path="/"
          render={rootRouteProps => {
            const [
              { autorefreshInterval, autorefreshIsPaused, dateRangeStart, dateRangeEnd },
            ] = useUrlParams(rootRouteProps.history, rootRouteProps.location);
            return (
              <ApolloProvider client={client}>
                <UptimeSettingsContext.Provider
                  value={{
                    autorefreshInterval,
                    autorefreshIsPaused,
                    basePath,
                    dateRangeStart,
                    dateRangeEnd,
                    colors,
                    refreshApp,
                    setHeadingText,
                  }}
                >
                  <UptimeRefreshContext.Provider value={{ lastRefresh }}>
                    <EuiPage className="app-wrapper-panel " data-test-subj="uptimeApp">
                      <div>
                        <EuiFlexGroup
                          alignItems="center"
                          justifyContent="spaceBetween"
                          gutterSize="s"
                        >
                          <EuiFlexItem grow={false}>
                            <EuiTitle>
                              <h2>{headingText}</h2>
                            </EuiTitle>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <UptimeDatePicker refreshApp={refreshApp} {...rootRouteProps} />
                          </EuiFlexItem>
                        </EuiFlexGroup>
                        <EuiSpacer size="s" />
                        <Switch>
                          <Route
                            exact
                            path="/"
                            render={routerProps => (
                              <OverviewPage
                                basePath={basePath}
                                setBreadcrumbs={setBreadcrumbs}
                                {...routerProps}
                              />
                            )}
                          />
                          <Route
                            path="/monitor/:id"
                            render={routerProps => (
                              <MonitorPage
                                query={client.query}
                                setBreadcrumbs={setBreadcrumbs}
                                {...routerProps}
                              />
                            )}
                          />
                        </Switch>
                      </div>
                    </EuiPage>
                  </UptimeRefreshContext.Provider>
                </UptimeSettingsContext.Provider>
              </ApolloProvider>
            );
          }}
        />
      </Router>
    </I18nContext>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
