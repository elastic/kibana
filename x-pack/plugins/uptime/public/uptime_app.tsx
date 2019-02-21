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
import { I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
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
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
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
  darkMode: boolean;
  graphQLClient: UMGraphQLClient;
  initialDateRangeStart: string;
  initialDateRangeEnd: string;
  initialAutorefreshInterval: number;
  initialAutorefreshIsPaused: boolean;
  kibanaBreadcrumbs: UMBreadcrumb[];
  routerBasename: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
  persistState(state: UptimePersistedState): void;
}

interface UptimeAppState {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  breadcrumbs: UMBreadcrumb[];
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
  headingText?: string;
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
    };
  }

  public componentWillMount() {
    this.setBreadcrumbs([overviewBreadcrumb]);
  }

  public render() {
    const { routerBasename, graphQLClient } = this.props;
    return (
      <I18nProvider>
        <Router basename={routerBasename}>
          <ApolloProvider client={graphQLClient}>
            <EuiPage className="app-wrapper-panel ">
              <div>
                <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiTitle>
                      <h2>{this.state.headingText}</h2>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
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
                      }}
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
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <Switch>
                  <Route
                    exact
                    path="/"
                    render={props => (
                      <OverviewPage
                        {...props}
                        {...this.props}
                        {...this.state}
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
                        setHeadingText={this.setHeadingText}
                        query={this.props.graphQLClient.query}
                      />
                    )}
                  />
                </Switch>
              </div>
            </EuiPage>
          </ApolloProvider>
        </Router>
      </I18nProvider>
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
}

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
