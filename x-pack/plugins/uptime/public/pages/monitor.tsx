/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiComboBoxOptionProps,
  // @ts-ignore No typings for EuiSpacer
  EuiSpacer,
  // @ts-ignore No typings for EuiSuperSelect
  EuiSuperSelect,
} from '@elastic/eui';
import { ApolloQueryResult, OperationVariables, QueryOptions } from 'apollo-client';
import gql from 'graphql-tag';
import React, { Fragment } from 'react';
import { getMonitorPageBreadcrumb } from '../breadcrumbs';
import {
  MonitorChartsQuery,
  MonitorPageTitleQuery,
  MonitorStatusBarQuery,
  PingListQuery,
} from '../components/queries';
import { UptimeCommonProps } from '../uptime_app';

interface MonitorPageProps {
  history: { push: any };
  location: { pathname: string };
  match: { params: { id: string } };
  // this is the query function provided by Apollo's Client API
  query: <T, TVariables = OperationVariables>(
    options: QueryOptions<TVariables>
  ) => Promise<ApolloQueryResult<T>>;
}

type Props = MonitorPageProps & UptimeCommonProps;

interface MonitorPageState {
  monitorId: string;
  selectedPingListOption?: EuiComboBoxOptionProps;
}

export class MonitorPage extends React.Component<Props, MonitorPageState> {
  constructor(props: Props) {
    super(props);

    // TODO: this is a hack because the id field's characters mess up react router's
    // inner params parsing, when we add a synthetic ID for monitors this problem should go away
    this.state = {
      monitorId: this.props.location.pathname.replace(/^(\/monitor\/)/, ''),
    };
  }

  public componentDidMount() {
    const { query, setBreadcrumbs, setHeadingText } = this.props;
    const { monitorId } = this.state;

    query({
      query: gql`
        query MonitorPageTitle($monitorId: String!) {
          monitorPageTitle: getMonitorPageTitle(monitorId: $monitorId) {
            id
            url
            name
          }
        }
      `,
      variables: { monitorId },
    }).then((result: any) => {
      const { name, url, id } = result.data.monitorPageTitle;
      const heading: string = name || url || id;
      setBreadcrumbs(getMonitorPageBreadcrumb(heading));
      setHeadingText(heading);
    });
  }

  public render() {
    const { dateRangeStart, dateRangeEnd } = this.props;
    const { monitorId } = this.state;

    return (
      <Fragment>
        <MonitorPageTitleQuery
          {...this.props}
          {...this.state}
          monitorId={monitorId}
          variables={{ monitorId }}
        />
        <EuiSpacer size="s" />
        <MonitorStatusBarQuery
          {...this.props}
          {...this.state}
          monitorId={monitorId}
          variables={{ dateRangeStart, dateRangeEnd, monitorId }}
        />
        <EuiSpacer size="s" />
        <MonitorChartsQuery
          {...this.props}
          {...this.state}
          monitorId={monitorId}
          variables={{ dateRangeStart, dateRangeEnd, monitorId }}
        />
        <EuiSpacer size="s" />
        <PingListQuery
          variables={{
            dateRangeStart,
            dateRangeEnd,
            monitorId,
            status: this.state.selectedPingListOption
              ? this.state.selectedPingListOption.value
              : 'down',
          }}
          {...this.props}
          {...this.state}
          onStatusSelectionChange={this.onPingListStatusSelectionChange}
          selectedOption={this.state.selectedPingListOption}
        />
      </Fragment>
    );
  }

  private onPingListStatusSelectionChange = (selectedOptions: EuiComboBoxOptionProps[]) => {
    if (selectedOptions[0]) {
      this.setState({ selectedPingListOption: selectedOptions[0] }, () => this.props.refreshApp());
    }
  };
}
