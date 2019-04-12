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

export interface UptimeAppColors {
  danger: string;
  success: string;
  range: string;
  mean: string;
}

export interface UptimePersistedState {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface UptimeAppProps {
  basePath: string;
  darkMode: boolean;
  client: UMGraphQLClient;
  initialDateRangeStart: string;
  initialDateRangeEnd: string;
  initialAutorefreshInterval: number;
  initialAutorefreshIsPaused: boolean;
  kibanaBreadcrumbs: UMBreadcrumb[];
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  persistState(state: UptimePersistedState): void;
  renderGlobalHelpControls(): void;
}

// TODO: when EUI exports types for this, this should be replaced
interface SuperDateRangePickerRangeChangedEvent {
  start: string;
  end: string;
}

interface SuperDateRangePickerRefreshChangedEvent {
  isPaused: boolean;
  refreshInterval?: number;
}

const Application = (props: UptimeAppProps) => {
  const {
    basePath,
    client,
    darkMode,
    initialAutorefreshIsPaused,
    initialAutorefreshInterval,
    initialDateRangeStart,
    initialDateRangeEnd,
    persistState,
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

  const [autorefreshIsPaused, setAutorefreshIsPaused] = useState<boolean>(
    initialAutorefreshIsPaused
  );
  const [autorefreshInterval, setAutorefreshInterval] = useState<number>(
    initialAutorefreshInterval
  );
  const [dateRangeStart, setDateRangeStart] = useState<string>(initialDateRangeStart);
  const [dateRangeEnd, setDateRangeEnd] = useState<string>(initialDateRangeEnd);
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
                  <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiTitle>
                        <h2>{headingText}</h2>
                      </EuiTitle>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {
                        // @ts-ignore onRefresh is not defined on EuiSuperDatePicker's type yet
                        <EuiSuperDatePicker
                          start={dateRangeStart}
                          end={dateRangeEnd}
                          isPaused={autorefreshIsPaused}
                          refreshInterval={autorefreshInterval}
                          onTimeChange={({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
                            setDateRangeStart(start);
                            setDateRangeEnd(end);
                            persistState({
                              autorefreshInterval,
                              autorefreshIsPaused,
                              dateRangeStart,
                              dateRangeEnd,
                            });
                            refreshApp();
                          }}
                          // @ts-ignore onRefresh is not defined on EuiSuperDatePicker's type yet
                          onRefresh={refreshApp}
                          onRefreshChange={({
                            isPaused,
                            refreshInterval,
                          }: SuperDateRangePickerRefreshChangedEvent) => {
                            setAutorefreshInterval(
                              refreshInterval === undefined ? autorefreshInterval : refreshInterval
                            );
                            setAutorefreshIsPaused(isPaused);
                            persistState({
                              autorefreshInterval,
                              autorefreshIsPaused,
                              dateRangeStart,
                              dateRangeEnd,
                            });
                          }}
                        />
                      }
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
      </Router>
    </I18nContext>
  );
};

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
