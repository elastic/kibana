/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React, { Component, Fragment } from 'react';
import { Filter, Query, TimeRange } from 'src/plugins/data/public';
import { UISession } from '../../types';
import { TableText } from '../';

interface Props {
  searchSession: UISession;
}

interface State {
  isLoading: boolean;
  isFlyoutVisible: boolean;
  calloutTitle: string;
  error: Error | null;
}

export class InfoButton extends Component<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      isLoading: false,
      isFlyoutVisible: false,
      calloutTitle: 'Search Session Info',
      error: null,
    };

    this.closeFlyout = this.closeFlyout.bind(this);
    this.showFlyout = this.showFlyout.bind(this);
  }

  public renderInfo() {
    const { error: err } = this.state;
    if (err) {
      return err.message;
    }

    const { created, id, initialState, restoreState } = this.props.searchSession;

    const sessionInfo = [
      {
        title: 'Search Session Id',
        description: id,
      },
      {
        title: 'Created at',
        description: moment(created).toLocaleString(),
      },
    ];

    if (initialState.timeRange) {
      const initialTimerange = initialState.timeRange as TimeRange;
      sessionInfo.push({
        title: 'Initial time range',
        description: `${initialTimerange.from} - ${initialTimerange.to}`,
      });
    }

    if (restoreState.timeRange) {
      const restoreTimerange = restoreState.timeRange as TimeRange;
      sessionInfo.push({
        title: 'Actual time range',
        description: `${restoreTimerange.from} - ${restoreTimerange.to}`,
      });
    }

    if (restoreState.query) {
      const query = restoreState.query as Query;
      sessionInfo.push({
        title: 'Query',
        description: query.query ? `${query.query} (${query.language})` : 'N/A',
      });
    }

    if (restoreState.filters) {
      const filters = restoreState.filters as Filter[];
      sessionInfo.push({
        title: 'Filters',
        description: filters && filters.length ? JSON.stringify(filters) : 'N/A',
      });
    }

    return (
      <Fragment>
        <EuiDescriptionList listItems={sessionInfo} type="column" align="center" compressed />
        <EuiSpacer size="s" />
      </Fragment>
    );
  }

  public render() {
    let flyout;

    if (this.state.isFlyoutVisible) {
      flyout = (
        <EuiPortal>
          <EuiFlyout
            ownFocus
            onClose={this.closeFlyout}
            size="s"
            aria-labelledby="flyoutTitle"
            data-test-subj="searchSessionsFlyout"
          >
            <EuiFlyoutHeader hasBorder>
              <EuiTitle size="m">
                <h2 id="flyoutTitle">{this.state.calloutTitle}</h2>
              </EuiTitle>
            </EuiFlyoutHeader>
            <EuiFlyoutBody>
              <EuiText>{this.renderInfo()}</EuiText>
            </EuiFlyoutBody>
          </EuiFlyout>
        </EuiPortal>
      );
    }

    return (
      <Fragment>
        <TableText onClick={this.showFlyout}>
          <FormattedMessage
            id="xpack.data.mgmt.searchSessions.actionInfo"
            aria-label="Show search session info"
            defaultMessage="Info"
          />
        </TableText>
        {flyout}
      </Fragment>
    );
  }

  private closeFlyout = () => {
    this.setState({
      isFlyoutVisible: false,
    });
  };

  private showFlyout = () => {
    this.setState({ isFlyoutVisible: true });
  };
}
