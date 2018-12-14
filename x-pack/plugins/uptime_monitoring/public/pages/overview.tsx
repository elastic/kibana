/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { MonitorList } from '../components/queries/monitor_list';
import { Snapshot } from '../components/queries/snapshot';
import { UMUpdateBreadcrumbs } from '../lib/lib';

interface OverviewPageProps {
  autorefreshInterval: number;
  autorefreshEnabled: boolean;
  dateRangeStart: number;
  dateRangeEnd: number;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

export class OverviewPage extends React.Component<OverviewPageProps> {
  constructor(props: OverviewPageProps) {
    super(props);
  }

  public componentWillMount() {
    this.props.setBreadcrumbs(getOverviewPageBreadcrumbs());
  }

  public render() {
    const { autorefreshEnabled, autorefreshInterval, dateRangeStart, dateRangeEnd } = this.props;
    return (
      <Fragment>
        <Snapshot
          autorefreshEnabled={autorefreshEnabled}
          autorefreshInterval={autorefreshInterval}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
        />
        <EuiSpacer size="xl" />
        <MonitorList
          autorefreshEnabled={autorefreshEnabled}
          autorefreshInterval={autorefreshInterval}
          start={dateRangeStart}
          end={dateRangeEnd}
        />
        <Link to="/monitor/http@https://www.google.com/">A monitor&#8217;s ID</Link>
        <p>This is where the Uptime app will live.</p>
      </Fragment>
    );
  }
}
