/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHeader,
  EuiHeaderBreadcrumbs,
  // @ts-ignore missing typings for EuiHeaderLogo
  EuiHeaderLogo,
  EuiHeaderSection,
  // @ts-ignore missing typings for EuiHeaderSectionItem
  EuiHeaderSectionItem,
  EuiIcon,
  EuiPage,
  EuiPageContent,
  EuiPopover,
  EuiSwitch,
} from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { Breadcrumb } from 'ui/chrome';
import { overviewBreadcrumb } from './breadcrumbs';
import { UMUpdateBreadcrumbs, UptimeAppProps } from './lib/lib';
import { MonitorPage, OverviewPage } from './pages';

interface UptimeAppState {
  breadcrumbs: Breadcrumb[];
  autorefreshEnabled: boolean;
  popoverIsOpen: boolean;
  selectedAutorefresh: any;
  autorefreshOptions: any[];
  dateRangeStart: number;
  dateRangeEnd: number;
}

class Application extends React.Component<UptimeAppProps, UptimeAppState> {
  private setBreadcrumbs: UMUpdateBreadcrumbs;
  constructor(props: UptimeAppProps) {
    super(props);

    const { isUsingK7Design, kibanaBreadcrumbs, updateBreadcrumbs } = this.props;
    let initialBreadcrumbs: Breadcrumb[];
    const dateRangeEnd = moment()
      .add(2, 'hours')
      .valueOf();
    const dateRangeStart = moment()
      .subtract(1, 'day')
      .valueOf();
    if (isUsingK7Design) {
      this.setBreadcrumbs = updateBreadcrumbs;
      initialBreadcrumbs = kibanaBreadcrumbs;
    } else {
      this.setBreadcrumbs = (breadcrumbs: Breadcrumb[]) => this.setState({ breadcrumbs });
      initialBreadcrumbs = [overviewBreadcrumb];
    }

    const minsToMillis = (mins: number) => mins * 60 * 1000;
    const autorefreshOptions = [
      { label: '5s', value: 5000 },
      { label: '15s', value: 15000 },
      { label: '30s', value: 30000 },
      { label: '1m', value: minsToMillis(1) },
      { label: '5m', value: minsToMillis(5) },
      { label: '10m', value: minsToMillis(10) },
      { label: '30m', value: minsToMillis(30) },
    ];
    this.state = {
      autorefreshEnabled: false,
      breadcrumbs: initialBreadcrumbs,
      popoverIsOpen: false,
      autorefreshOptions,
      selectedAutorefresh: autorefreshOptions[0],
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
      <Router basename={routerBasename}>
        <ApolloProvider client={graphQLClient}>
          <EuiPage className="app-wrapper-panel">
            <EuiHeader>
              <EuiHeaderSection>
                <EuiHeaderSectionItem border="right">
                  <EuiHeaderLogo
                    aria-label="Go to Uptime Monitoring home page"
                    href="#/"
                    iconType="heartbeatApp"
                    iconTitle="Uptime Monitoring"
                  >
                    Uptime Monitoring
                    <EuiIcon
                      style={{ paddingLeft: '8px' }}
                      size="xl"
                      // @ts-ignore missing typings for beaker icon
                      type="beaker"
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
                  <EuiPopover
                    id="autorefresPopover"
                    button={
                      <EuiButton
                        iconType="arrowDown"
                        iconSide="right"
                        onClick={() => this.setState({ popoverIsOpen: true })}
                      >
                        {this.state.autorefreshEnabled
                          ? 'Autorefresh every ' + this.state.selectedAutorefresh.label
                          : 'Autorefresh Disabled'}
                      </EuiButton>
                    }
                    closePopover={() => this.setState({ popoverIsOpen: false })}
                    isOpen={this.state.popoverIsOpen}
                    style={{ paddingLeft: '8px', paddingTop: '10px', paddingRight: '8px' }}
                  >
                    <EuiFlexGroup direction="column">
                      <EuiFlexItem>
                        <EuiSwitch
                          label="Auto-refresh"
                          checked={this.state.autorefreshEnabled}
                          onChange={e => this.setState({ autorefreshEnabled: e.target.checked })}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiComboBox
                          onChange={selectedOptions =>
                            this.setState({ selectedAutorefresh: selectedOptions[0] })
                          }
                          options={this.state.autorefreshOptions}
                          isClearable={false}
                          singleSelection={{ asPlainText: true }}
                          selectedOptions={[this.state.selectedAutorefresh]}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPopover>
                </EuiHeaderSectionItem>
              </EuiHeaderSection>
            </EuiHeader>
            <EuiPageContent>
              <Switch>
                <Route
                  exact
                  path="/"
                  render={props => <OverviewPage {...props} setBreadcrumbs={this.setBreadcrumbs} />}
                />
                <Route
                  path="/monitor/:id"
                  render={props => (
                    <MonitorPage
                      {...props}
                      dateRangeStart={this.state.dateRangeStart}
                      dateRangeEnd={this.state.dateRangeEnd}
                      updateBreadcrumbs={this.setBreadcrumbs}
                      autorefreshEnabled={this.state.autorefreshEnabled}
                      autorefreshInterval={this.state.selectedAutorefresh.value}
                    />
                  )}
                />
              </Switch>
            </EuiPageContent>
          </EuiPage>
        </ApolloProvider>
      </Router>
    );
  }
}

export const UptimeMonitoringApp = (props: UptimeAppProps) => <Application {...props} />;
