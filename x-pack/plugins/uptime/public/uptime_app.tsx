/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiHeader,
  EuiHeaderBreadcrumbs,
  // @ts-ignore missing typings for EuiHeaderLink
  EuiHeaderLink,
  // @ts-ignore missing typings for EuiHeaderLinks
  EuiHeaderLinks,
  // @ts-ignore missing typings for EuiHeaderLogo
  EuiHeaderLogo,
  EuiHeaderSection,
  // @ts-ignore missing typings for EuiHeaderSectionItem
  EuiHeaderSectionItem,
  EuiPage,
  EuiPageContent,
  // @ts-ignore missing typings for EuiSuperDatePicker
  EuiSuperDatePicker,
} from '@elastic/eui';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import euiLightVars from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { I18nContext } from 'ui/i18n';
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
  isUsingK7Design: boolean;
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
      isUsingK7Design,
      kibanaBreadcrumbs,
      updateBreadcrumbs,
    } = props;

    let initialBreadcrumbs: UMBreadcrumb[];

    if (isUsingK7Design) {
      this.setBreadcrumbs = updateBreadcrumbs;
      initialBreadcrumbs = kibanaBreadcrumbs;
    } else {
      this.setBreadcrumbs = (breadcrumbs: UMBreadcrumb[]) => this.setState({ breadcrumbs });
      initialBreadcrumbs = [overviewBreadcrumb];
    }

    let colors: UptimeAppColors;
    if (darkMode) {
      colors = {
        primary: euiDarkVars.euiColorVis1,
        secondary: euiDarkVars.euiColorVis0,
        danger: euiDarkVars.euiColorVis9,
      };
    } else {
      colors = {
        primary: euiLightVars.euiColorVis1,
        secondary: euiLightVars.euiColorVis0,
        danger: euiLightVars.euiColorVis9,
      };
    }

    this.state = {
      autorefreshIsPaused,
      autorefreshInterval,
      breadcrumbs: initialBreadcrumbs,
      colors,
      dateRangeStart,
      dateRangeEnd,
    };
  }

  public componentWillMount() {
    this.setBreadcrumbs([overviewBreadcrumb]);
  }

  public render() {
    const { isUsingK7Design, routerBasename, graphQLClient } = this.props;
    return (
      <I18nContext>
        <Router basename={routerBasename}>
          <ApolloProvider client={graphQLClient}>
            <EuiPage className="app-wrapper-panel">
              <EuiHeader>
                {/*
              // @ts-ignore TODO no typings for grow prop */}
                <EuiHeaderSection grow={true}>
                  <EuiHeaderSectionItem border="right">
                    <EuiHeaderLogo
                      aria-label={i18n.translate('xpack.uptime.appHeader.uptimeLogoAriaLabel', {
                        defaultMessage: 'Go to Uptime home page',
                      })}
                      href="#/"
                      iconType="heartbeatApp"
                      iconTitle={i18n.translate('xpack.uptime.appHeader.uptimeLogoTitle', {
                        defaultMessage: 'Uptime',
                      })}
                    >
                      <FormattedMessage
                        id="xpack.uptime.appHeader.uptimeLogoText"
                        defaultMessage="Uptime"
                      />
                    </EuiHeaderLogo>
                  </EuiHeaderSectionItem>
                  {!isUsingK7Design && (
                    <EuiHeaderSectionItem>
                      <div style={{ paddingTop: '20px', paddingRight: '8px' }}>
                        <EuiHeaderBreadcrumbs breadcrumbs={this.state.breadcrumbs} />
                      </div>
                    </EuiHeaderSectionItem>
                  )}
                </EuiHeaderSection>
                <EuiHeaderSection side="right">
                  <EuiHeaderSectionItem border="none">
                    <div
                      style={{
                        marginTop: '4px',
                        marginLeft: '16px',
                        marginRight: '16px',
                        minWidth: '600px',
                      }}
                    >
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
                    </div>
                  </EuiHeaderSectionItem>
                </EuiHeaderSection>
                <EuiHeaderSection side="right">
                  <EuiHeaderSection>
                    <EuiHeaderLinks>
                      <EuiHeaderLink
                        aria-label={i18n.translate('xpack.uptime.header.helpLinkAriaLabel', {
                          defaultMessage: 'Go to our discuss page',
                        })}
                        iconType="help"
                        href="https://discuss.elastic.co/c/beats/heartbeat"
                        target="_blank"
                      >
                        <FormattedMessage
                          id="xpack.uptime.header.helpLinkText"
                          defaultMessage="Discuss"
                          description="The link is to a support form called 'Discuss', where users can submit feedback."
                        />
                      </EuiHeaderLink>
                    </EuiHeaderLinks>
                  </EuiHeaderSection>
                </EuiHeaderSection>
              </EuiHeader>
              <EuiPageContent>
                <Switch>
                  <Route
                    exact
                    path="/"
                    render={props => (
                      <OverviewPage
                        {...props}
                        {...this.state}
                        setBreadcrumbs={this.setBreadcrumbs}
                      />
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
              </EuiPageContent>
            </EuiPage>
          </ApolloProvider>
        </Router>
      </I18nContext>
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
