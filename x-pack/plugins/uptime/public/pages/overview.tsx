/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore EuiSearchBar missing
import { EuiSearchBar, EuiSpacer } from '@elastic/eui';
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
import { UMUpdateBreadcrumbs } from '../lib/lib';
import { UptimeCommonProps } from '../uptime_app';

interface OverviewPageProps {
  basePath: string;
  setBreadcrumbs: UMUpdateBreadcrumbs;
}

type Props = OverviewPageProps & UptimeCommonProps;

interface OverviewPageState {
  currentFilterObj?: object;
  currentFilterQuery?: string;
}

export type UptimeSearchBarQueryChangeHandler = ({ query }: { query?: { text: string } }) => void;

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
    const commonVariables = {
      dateRangeStart: this.props.dateRangeStart,
      dateRangeEnd: this.props.dateRangeEnd,
      filters: this.state.currentFilterQuery,
    };
    return (
      <Fragment>
        <EmptyStateQuery
          implementsCustomErrorState={true}
          variables={commonVariables}
          {...this.props}
        >
          <FilterBarQuery
            {...this.props}
            currentQuery={this.state.currentFilterObj}
            updateQuery={this.onFilterQueryChange}
            variables={commonVariables}
          />
          <EuiSpacer size="s" />
          <SnapshotQuery variables={commonVariables} {...this.props} />
          <EuiSpacer size="s" />
          <MonitorListQuery variables={commonVariables} {...this.props} />
          <EuiSpacer size="s" />
          <ErrorListQuery variables={commonVariables} {...this.props} />
        </EmptyStateQuery>
      </Fragment>
    );
  }

  private onFilterQueryChange: UptimeSearchBarQueryChangeHandler = ({
    query,
  }: {
    query?: { text: string };
  }) => {
    try {
      let esQuery;
      if (query && query.text) {
        esQuery = EuiSearchBar.Query.toESQuery(query);
      }
      this.setState(
        {
          currentFilterObj: query,
          currentFilterQuery: esQuery ? JSON.stringify(esQuery) : esQuery,
        },
        () => this.props.refreshApp()
      );
    } catch (e) {
      this.setState({ currentFilterQuery: undefined });
    }
  };
}
