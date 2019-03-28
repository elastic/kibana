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
import { NormalizedCacheObject } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
import { overviewBreadcrumb, UMBreadcrumb } from './breadcrumbs';
import { UMGraphQLClient, UMUpdateBreadcrumbs } from './lib/lib';
import { MonitorPage, OverviewPage } from './pages';

interface UptimeAppColors {
  danger: string;
  success: string;
  range: string;
  mean: string;
}

// TODO: these props are global to this app, we should put them in a context
export interface UptimeCommonProps {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  client: ApolloClient<NormalizedCacheObject>;
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
  refreshApp: () => void;
  registerWatch: (client: () => void) => void;
  removeWatch: (client: () => void) => void;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  setHeadingText: (text: string) => void;
}

export interface UptimePersistedState {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  dateRangeStart: string;
  dateRangeEnd: string;
}

export interface UptimeAppProps {
  // TODO: if we add a context to the Uptime UI, this should be included in it
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

type RefreshListener = () => void;

interface UptimeAppState {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  breadcrumbs: UMBreadcrumb[];
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
  headingText?: string;
  refreshListeners: RefreshListener[];
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

class Application extends React.Component<UptimeAppProps, UptimeAppState> {
  private setBreadcrumbs: UMUpdateBreadcrumbs;
  constructor(props: UptimeAppProps) {
    super(props);

    const {
      darkMode,
      initialAutorefreshIsPaused: autorefreshIsPaused,
      initialAutorefreshInterval: autorefreshInterval,
      initialDateRangeStart: dateRangeStart,
      initialDateRangeEnd: dateRangeEnd,
      kibanaBreadcrumbs,
      setBreadcrumbs,
    } = props;

    this.setBreadcrumbs = setBreadcrumbs;

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

    this.state = {
      autorefreshIsPaused,
      autorefreshInterval,
      breadcrumbs: kibanaBreadcrumbs,
      colors,
      dateRangeStart,
      dateRangeEnd,
      refreshListeners: [],
    };
  }

  public componentWillMount() {
    this.setBreadcrumbs([overviewBreadcrumb]);
  }

  public componentDidMount() {
    this.props.renderGlobalHelpControls();
  }

  public render() {
    const { basePath, routerBasename, client } = this.props;
    return (
      <I18nContext>
        <Router basename={routerBasename}>
          <ApolloProvider client={client}>
            <EuiPage className="app-wrapper-panel ">
              <div>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle>
                      <h2>{this.state.headingText}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {
                      // @ts-ignore onRefresh is not defined on EuiSuperDatePicker's type yet
                      <EuiSuperDatePicker
                        start={this.state.dateRangeStart}
                        end={this.state.dateRangeEnd}
                        isPaused={this.state.autorefreshIsPaused}
                        refreshInterval={this.state.autorefreshInterval}
                        onTimeChange={({ start, end }: SuperDateRangePickerRangeChangedEvent) => {
                          this.setState(
                            { dateRangeStart: start, dateRangeEnd: end },
                            this.persistState
                          );
                          this.refreshApp();
                        }}
                        // @ts-ignore onRefresh is not defined on EuiSuperDatePicker's type yet
                        onRefresh={() => this.refreshApp()}
                        onRefreshChange={({
                          isPaused,
                          refreshInterval,
                        }: SuperDateRangePickerRefreshChangedEvent) => {
                          const autorefreshInterval =
                            refreshInterval === undefined
                              ? this.state.autorefreshInterval
                              : refreshInterval;
                          this.setState(
                            { autorefreshIsPaused: isPaused, autorefreshInterval },
                            this.persistState
                          );
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
                    render={props => (
                      <OverviewPage
                        basePath={basePath}
                        {...props}
                        {...this.props}
                        {...this.state}
                        registerWatch={this.addForceRefreshListener}
                        removeWatch={this.removeForceRefreshListener}
                        refreshApp={this.refreshApp}
                        setHeadingText={this.setHeadingText}
                      />
                    )}
                  />
                  <Route
                    path="/monitor/:id"
                    render={props => (
                      <MonitorPage
                        {...props}
                        {...this.props}
                        {...this.state}
                        registerWatch={this.addForceRefreshListener}
                        removeWatch={this.removeForceRefreshListener}
                        refreshApp={this.refreshApp}
                        setHeadingText={this.setHeadingText}
                        query={this.props.client.query}
                      />
                    )}
                  />
                </Switch>
              </div>
            </EuiPage>
          </ApolloProvider>
        </Router>
      </I18nContext>
    );
  }

  private setHeadingText = (headingText: string): void => {
    this.setState({ headingText });
  };

  private persistState = (): void => {
    const { autorefreshIsPaused, autorefreshInterval, dateRangeStart, dateRangeEnd } = this.state;
    this.props.persistState({
      autorefreshIsPaused,
      autorefreshInterval,
      dateRangeStart,
      dateRangeEnd,
    });
  };

  private addForceRefreshListener = (newClient: () => void): void => {
    this.setState(state => ({
      ...state,
      refreshListeners: [...state.refreshListeners, newClient],
    }));
  };

  private removeForceRefreshListener = (toRemove: () => void): void => {
    const index = this.state.refreshListeners.indexOf(toRemove);
    if (index) {
      this.setState(state => ({
        ...state,
        refreshListeners: state.refreshListeners.splice(index, 1),
      }));
    }
  };

  private refreshApp = () => {
    this.state.refreshListeners.forEach(handler => handler());
  };
}

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
