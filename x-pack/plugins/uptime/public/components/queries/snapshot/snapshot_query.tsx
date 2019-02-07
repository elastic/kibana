/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { Query } from 'react-apollo';
import { UptimeCommonProps } from '../../../uptime_app';
import { Snapshot, SnapshotLoading } from '../../functional';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotQueryProps {
  filters?: string;
}

interface SnapshotQueryState {
  windowWidth: number;
}

type Props = SnapshotQueryProps & UptimeCommonProps;

export class SnapshotQuery extends React.Component<Props, SnapshotQueryState> {
  constructor(props: Props) {
    super(props);
    this.state = {
      windowWidth: window.innerWidth,
    };
  }

  public componentDidMount() {
    window.addEventListener('resize', this.updateWindowSize);
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowSize);
  }

  public render() {
    const {
      autorefreshIsPaused,
      autorefreshInterval,
      colors: { primary, danger },
      dateRangeStart,
      dateRangeEnd,
      filters,
    } = this.props;

    return (
      <Query
        pollInterval={autorefreshIsPaused ? undefined : autorefreshInterval}
        query={getSnapshotQuery}
        variables={{ dateRangeStart, dateRangeEnd, filters }}
      >
        {({ loading, error, data }) => {
          if (loading) {
            return <SnapshotLoading />;
          }
          if (error) {
            return i18n.translate('xpack.uptime.snapshot.errorMessage', {
              values: { message: error.message },
              defaultMessage: 'Error {message}',
            });
          }
          const { snapshot } = data;

          return (
            <Snapshot
              dangerColor={danger}
              primaryColor={primary}
              snapshot={snapshot}
              windowWidth={this.state.windowWidth}
            />
          );
        }}
      </Query>
    );
  }

  private updateWindowSize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };
}
