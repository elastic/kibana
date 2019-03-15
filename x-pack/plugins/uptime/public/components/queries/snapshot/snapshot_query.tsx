/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLError } from 'graphql';
import { get } from 'lodash';
import React from 'react';
import { withApollo } from 'react-apollo';
import { Snapshot as SnapshotType } from '../../../../common/graphql/types';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { QueryCommonProps, UptimeCommonProps, UptimeCommonState } from '../../../uptime_app';
import { Snapshot, SnapshotLoading } from '../../functional';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotQueryProps {
  filters?: string;
  registerWatch: (manager: () => void) => void;
}

interface SnapshotQueryState {
  errors?: GraphQLError[];
  snapshot?: SnapshotType;
  loading: boolean;
  windowWidth: number;
}

type Props = SnapshotQueryProps & UptimeCommonProps & QueryCommonProps;
type State = SnapshotQueryState & UptimeCommonState;

class Query extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      loading: true,
      windowWidth: window.innerWidth,
    };
  }

  public componentDidMount() {
    window.addEventListener('resize', this.updateWindowSize);
    this.props.registerWatch(this.handleForceRefresh);
    this.fetch(this.props);
  }

  public componentWillUnmount() {
    window.removeEventListener('resize', this.updateWindowSize);
  }

  public render() {
    const {
      colors: { success, danger },
    } = this.props;
    const { errors, loading, snapshot, windowWidth } = this.state;

    if (loading || !snapshot) {
      return <SnapshotLoading />;
    }

    if (errors && errors.length) {
      formatUptimeGraphQLErrorList(errors);
    }

    return (
      <Snapshot
        dangerColor={danger}
        successColor={success}
        snapshot={snapshot}
        windowWidth={windowWidth}
      />
    );
  }

  private updateWindowSize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };
  private handleForceRefresh = () => {
    this.fetch(this.props);
  };
  private fetch = async (props: Props) => {
    const { client, dateRangeStart, dateRangeEnd, filters } = props;
    this.setState({ loading: true }, () =>
      client
        .query({
          fetchPolicy: 'network-only',
          query: getSnapshotQuery,
          variables: { dateRangeStart, dateRangeEnd, filters },
        })
        .then(({ data, errors, loading }) => {
          const snapshot = get(data, 'snapshot', undefined);
          this.setState({ snapshot, loading, errors });
        })
    );
  };
}

export const SnapshotQuery = withApollo(Query);
