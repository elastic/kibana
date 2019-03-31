/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import {
  EmptyStateQuery,
  ErrorListQuery,
  FilterBarQuery,
  MonitorListQuery,
  SnapshotQuery,
} from '../components/queries';
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeCommonProps } from '../uptime_app';

interface OverviewPageProps {
  basePath: string;
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
        <EmptyStateQuery {...this.props}>
          <FilterBarQuery
            {...this.props}
            updateQuery={(query: object | undefined) => {
              this.setState({ currentFilterQuery: query ? JSON.stringify(query) : query });
            }}
          />
          <SnapshotQuery filters={this.state.currentFilterQuery} {...this.props} />
          <EuiSpacer size="xl" />
          <MonitorListQuery filters={this.state.currentFilterQuery} {...this.props} />
          <EuiSpacer />
          <ErrorListQuery filters={this.state.currentFilterQuery} {...this.props} />
        </EmptyStateQuery>
      </Fragment>
    );
  }
}
