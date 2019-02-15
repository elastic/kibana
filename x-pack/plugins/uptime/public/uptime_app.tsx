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
import { FormattedMessage, I18nProvider } from '@kbn/i18n/react';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { overviewBreadcrumb, UMBreadcrumb } from './breadcrumbs';
import { UMGraphQLClient, UMUpdateBreadcrumbs } from './lib/lib';
import { MonitorPage, OverviewPage } from './pages';

interface UptimeAppColors {
  danger: string;
  primary: string;
  secondary: string;
}

// TODO: these props are global to this app, we should put them in a context
export interface UptimeCommonProps {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  colors: UptimeAppColors;
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
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  persistState(state: UptimePersistedState): void;
}

interface UptimeAppState {
  autorefreshIsPaused: boolean;
  autorefreshInterval: number;
  breadcrumbs: UMBreadcrumb[];
  colors: UptimeAppColors;
  dateRangeStart: string;
  dateRangeEnd: string;
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
      updateBreadcrumbs,
    } = props;

    this.setBreadcrumbs = updateBreadcrumbs;

    let colors: UptimeAppColors;
    if (darkMode) {
      colors = {
        primary: euiDarkVars.euiColorLightestShade,
        secondary: euiDarkVars.euiColorVis0,
        danger: euiDarkVars.euiColorVis9,
      };
    } else {
      colors = {
        primary: euiLightVars.euiColorLightShade,
        secondary: euiLightVars.euiColorVis0,
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
              <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiTitle>
                    <h2>
                      <FormattedMessage
                        id="xpack.uptime.appHeader.uptimeLogoText"
                        defaultMessage="Uptime"
                      />
                    </h2>
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
                    showUpdateButton={false}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="s" />
              <Switch>
                <Route
                  exact
                  path="/"
                  render={props => (
                    <OverviewPage {...props} {...this.state} setBreadcrumbs={this.setBreadcrumbs} />
                  )}
                />
                <Route
                  path="/monitor/:id"
                  render={props => (
                    <MonitorPage
                      {...props}
                      {...this.state}
                      updateBreadcrumbs={this.setBreadcrumbs}
                    />
                  )}
                />
              </Switch>
            </EuiPage>
          </ApolloProvider>
        </Router>
      </I18nProvider>
    );
  }

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
