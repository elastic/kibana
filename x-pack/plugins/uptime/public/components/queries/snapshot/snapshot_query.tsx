/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Snapshot as SnapshotType } from '../../../../common/graphql/types';
import { UptimeCommonProps } from '../../../uptime_app';
import { Snapshot, SnapshotLoading } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotQueryResult {
  snapshot?: SnapshotType;
}

interface SnapshotQueryState {
  snapshot?: SnapshotType;
  windowWidth: number;
}

type Props = UptimeCommonProps & UptimeGraphQLQueryProps<SnapshotQueryResult>;
type State = SnapshotQueryState;

class Query extends React.Component<Props, State> {
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
      colors: { success, danger },
      data,
    } = this.props;
    const { windowWidth } = this.state;

    if (data && data.snapshot) {
      return (
        <Snapshot
          dangerColor={danger}
          successColor={success}
          snapshot={data.snapshot}
          windowWidth={windowWidth}
        />
      );
    }
    return <SnapshotLoading />;
  }

  private updateWindowSize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };
}

export const SnapshotQuery = withUptimeGraphQL<SnapshotQueryResult>(Query, getSnapshotQuery);
