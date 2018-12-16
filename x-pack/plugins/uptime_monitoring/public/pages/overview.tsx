/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { FilterBar } from '../components/queries/filter_bar';
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

interface OverviewPageState {
  currentFilterQuery?: string;
}

export class OverviewPage extends React.Component<OverviewPageProps, OverviewPageState> {
  constructor(props: OverviewPageProps) {
    super(props);
    this.state = {
      currentFilterQuery: undefined,
    };
  }

  public componentWillMount() {
    this.props.setBreadcrumbs(getOverviewPageBreadcrumbs());
  }

  public render() {
    const { autorefreshEnabled, autorefreshInterval, dateRangeStart, dateRangeEnd } = this.props;
    return (
      <Fragment>
        <FilterBar
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          updateQuery={(query: object) => {
            if (query) {
              this.setState({ currentFilterQuery: JSON.stringify(query) });
            }
          }}
        />
        <Snapshot
          autorefreshEnabled={autorefreshEnabled}
          autorefreshInterval={autorefreshInterval}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          filters={this.state.currentFilterQuery}
        />
        <EuiSpacer size="xl" />
        <MonitorList
          autorefreshEnabled={autorefreshEnabled}
          autorefreshInterval={autorefreshInterval}
          dateRangeStart={dateRangeStart}
          dateRangeEnd={dateRangeEnd}
          filters={this.state.currentFilterQuery}
        />
      </Fragment>
    );
  }
}
