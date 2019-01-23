/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import { EmptyState } from '../components/queries/empty_state';
import { ErrorList } from '../components/queries/error_list';
import { FilterBar } from '../components/queries/filter_bar';
import { MonitorList } from '../components/queries/monitor_list';
import { Snapshot } from '../components/queries/snapshot';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeCommonProps } from '../uptime_app';

interface OverviewPageProps {
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps & UptimeCommonProps;

interface OverviewPageState {
  currentFilterQuery?: string;
}

export class OverviewPage extends React.Component<Props, OverviewPageState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      currentFilterQuery: undefined,
    };
  }

  public componentWillMount() {
    this.props.setBreadcrumbs(getOverviewPageBreadcrumbs());
  }

  public render() {
    return (
      <Fragment>
        <EmptyState {...this.props}>
          <FilterBar
            {...this.props}
            updateQuery={(query: object | undefined) => {
              this.setState({ currentFilterQuery: query ? JSON.stringify(query) : query });
            }}
          />
          <Snapshot filters={this.state.currentFilterQuery} {...this.props} />
          <EuiSpacer size="xl" />
          <MonitorList filters={this.state.currentFilterQuery} {...this.props} />
          <EuiSpacer />
          <ErrorList filters={this.state.currentFilterQuery} {...this.props} />
        </EmptyState>
      </Fragment>
    );
  }
}
