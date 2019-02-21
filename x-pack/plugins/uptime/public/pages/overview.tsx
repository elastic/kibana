/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { getOverviewPageBreadcrumbs } from '../breadcrumbs';
import {
  EmptyStateQuery,
  ErrorListQuery,
  FilterBarQuery,
  MonitorListQuery,
  SnapshotQuery,
} from '../components/queries';
import { UptimeCommonProps } from '../uptime_app';

type Props = UptimeCommonProps;

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
    this.props.setHeadingText(
      i18n.translate('xpack.uptime.overviewPage.headerText', {
        defaultMessage: 'Overview',
        description: `The text that will be displayed in the app's heading when the Overview page loads.`,
      })
    );
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
          <EuiSpacer size="s" />
          <SnapshotQuery filters={this.state.currentFilterQuery} {...this.props} />
          <EuiSpacer size="s" />
          <MonitorListQuery filters={this.state.currentFilterQuery} {...this.props} />
          <EuiSpacer size="s" />
          <ErrorListQuery filters={this.state.currentFilterQuery} {...this.props} />
        </EmptyStateQuery>
      </Fragment>
    );
  }
}
