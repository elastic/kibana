/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiComboBox,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
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
  EuiPopover,
  EuiSwitch,
} from '@elastic/eui';
import moment, { Moment } from 'moment';
import React from 'react';
import { ApolloProvider } from 'react-apollo';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { overviewBreadcrumb, UMBreadcrumb } from './breadcrumbs';
import { UMUpdateBreadcrumbs, UptimeAppProps } from './lib/lib';
import { MonitorPage, OverviewPage } from './pages';

export interface UptimePersistedState {
  autorefreshEnabled: boolean;
  autorefreshInterval: number;
  dateRangeStart: number;
  dateRangeEnd: number;
}

interface UptimeAppState {
  breadcrumbs: UMBreadcrumb[];
  autorefreshEnabled: boolean;
  popoverIsOpen: boolean;
  // TODO: these get passed as props to most components in this plugin,
  // they can probably be globalized in a context
  selectedAutorefresh: any;
  autorefreshOptions: any[];
  dateRangeStart: number;
  dateRangeEnd: number;
}

class Application extends React.Component<UptimeAppProps, UptimeAppState> {
  private setBreadcrumbs: UMUpdateBreadcrumbs;
  constructor(props: UptimeAppProps) {
    super(props);

    const {
      isUsingK7Design,
      kibanaBreadcrumbs,
      updateBreadcrumbs,
      initialAutorefreshEnabled,
      initialAutorefreshInterval,
      initialDateRangeStart,
      initialDateRangeEnd,
    } = props;

    let initialBreadcrumbs: UMBreadcrumb[];
    const dateRangeStart =
      initialDateRangeStart ||
      moment()
        .subtract(1, 'day')
        .valueOf();
    // TODO: this will cause the date range to default to being greater than "now"
    // when we start using the SuperDatePicker, we'll likely revise this.
    const dateRangeEnd =
      initialDateRangeEnd && initialDateRangeEnd > moment().valueOf()
        ? initialDateRangeEnd
        : moment()
            .add(1, 'hours')
            .valueOf();

    if (isUsingK7Design) {
      this.setBreadcrumbs = updateBreadcrumbs;
      initialBreadcrumbs = kibanaBreadcrumbs;
    } else {
      this.setBreadcrumbs = (breadcrumbs: UMBreadcrumb[]) => this.setState({ breadcrumbs });
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
      autorefreshEnabled: initialAutorefreshEnabled || false,
      breadcrumbs: initialBreadcrumbs,
      popoverIsOpen: false,
      autorefreshOptions,
      selectedAutorefresh:
        autorefreshOptions.find(opt => opt.value === initialAutorefreshInterval) ||
        autorefreshOptions[0],
      dateRangeStart,
      dateRangeEnd,
    };
  }

  public componentWillMount() {
    this.setBreadcrumbs([overviewBreadcrumb]);
  }

  public render() {
    const { isUsingK7Design, routerBasename, graphQLClient } = this.props;
    const dateRangeIsInvalid = () => this.state.dateRangeStart > this.state.dateRangeEnd;
    return (
      <Router basename={routerBasename}>
        <ApolloProvider client={graphQLClient}>
          <EuiPage className="app-wrapper-panel">
            <EuiHeader>
              {/*
              // @ts-ignore TODO no typings for grow prop */}
              <EuiHeaderSection grow={true}>
                <EuiHeaderSectionItem border="right">
                  <EuiHeaderLogo
                    aria-label="Go to Uptime home page"
                    href="#/"
                    iconType="heartbeatApp"
                    iconTitle="Uptime"
                  >
                    Uptime
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
                  <div style={{ marginTop: '10px', marginLeft: '8px' }}>
                    <EuiDatePickerRange
                      startDateControl={
                        <EuiDatePicker
                          selected={moment(this.state.dateRangeStart)}
                          isInvalid={dateRangeIsInvalid()}
                          aria-label="Start Date"
                          onChange={(e: Moment | null) => {
                            if (e && e.valueOf() < this.state.dateRangeEnd) {
                              this.setState({ dateRangeStart: e.valueOf() }, this.persistState);
                            }
                          }}
                          showTimeSelect
                        />
                      }
                      endDateControl={
                        <EuiDatePicker
                          selected={moment(this.state.dateRangeEnd)}
                          isInvalid={dateRangeIsInvalid()}
                          aria-label="End Date"
                          onChange={(e: Moment | null) => {
                            if (e && this.state.dateRangeStart < e.valueOf()) {
                              this.setState({ dateRangeEnd: e.valueOf() }, this.persistState);
                            }
                          }}
                          showTimeSelect
                        />
                      }
                    />
                  </div>
                </EuiHeaderSectionItem>
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
                          onChange={e => {
                            this.setState(
                              { autorefreshEnabled: e.target.checked },
                              this.persistState
                            );
                          }}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiComboBox
                          onChange={selectedOptions => {
                            this.setState(
                              { selectedAutorefresh: selectedOptions[0] },
                              this.persistState
                            );
                          }}
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
              <EuiHeaderSection side="right">
                <EuiHeaderSection>
                  <EuiHeaderLinks>
                    <EuiHeaderLink
                      iconType="help"
                      href="https://discuss.elastic.co/c/beats/heartbeat"
                      target="_blank"
                    >
                      Discuss
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
                      autorefreshEnabled={this.state.autorefreshEnabled}
                      autorefreshInterval={this.state.selectedAutorefresh.value}
                      dateRangeStart={this.state.dateRangeStart}
                      dateRangeEnd={this.state.dateRangeEnd}
                      setBreadcrumbs={this.setBreadcrumbs}
                    />
                  )}
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

  private persistState = (): void => {
    const {
      autorefreshEnabled,
      selectedAutorefresh: { value },
      dateRangeStart,
      dateRangeEnd,
    } = this.state;
    if (dateRangeEnd > dateRangeStart) {
      this.props.persistState({
        autorefreshEnabled,
        autorefreshInterval: value,
        dateRangeStart,
        dateRangeEnd,
      });
    }
  };
}

export const UptimeApp = (props: UptimeAppProps) => <Application {...props} />;
