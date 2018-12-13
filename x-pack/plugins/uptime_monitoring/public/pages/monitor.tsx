/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  // @ts-ignore No typings for EuiSpacer
  EuiSpacer,
  // @ts-ignore No typings for EuiSuperSelect
  EuiSuperSelect,
  EuiTitle,
} from '@elastic/eui';
import React, { Fragment } from 'react';
import { getMonitorPageBreadcrumb } from '../breadcrumbs';
import { MonitorCharts } from '../components/queries/monitor_charts';
import { MonitorSelect } from '../components/queries/monitor_select';
import { MonitorStatusBar } from '../components/queries/monitor_status_bar';
import { Pings } from '../components/queries/ping_list';
import { UMUpdateBreadcrumbs } from '../lib/lib';

interface MonitorPageProps {
  updateBreadcrumbs: UMUpdateBreadcrumbs;
  match: { params: { id: string } };
  dateRangeStart: number;
  dateRangeEnd: number;
}

export class MonitorPage extends React.Component<MonitorPageProps> {
  constructor(props: MonitorPageProps) {
    super(props);
  }

  public componentWillMount() {
    this.props.updateBreadcrumbs(getMonitorPageBreadcrumb());
  }

  public render() {
    const { dateRangeStart, dateRangeEnd } = this.props;
    const id = decodeURIComponent(this.props.match.params.id);
    return (
      <Fragment>
        <EuiTitle>
          <h2>{id}</h2>
        </EuiTitle>
        <EuiSpacer size="l" />
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <span>Monitor:</span>
          </EuiFlexItem>
          <EuiFlexItem>
            <MonitorSelect
              dateRangeStart={dateRangeStart}
              dateRangeEnd={dateRangeEnd}
              valueOfSelectedMonitor={id}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <MonitorStatusBar
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          monitorId={id}
        />
        <EuiSpacer />
        <MonitorCharts monitorId={id} dateRangeStart={dateRangeStart} dateRangeEnd={dateRangeEnd} />
        <EuiSpacer />
        <Pings
          dateRangeStart={this.props.dateRangeStart}
          dateRangeEnd={this.props.dateRangeEnd}
          monitorId={id}
        />
      </Fragment>
    );
  }
}
