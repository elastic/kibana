/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Snapshot as SnapshotType } from '../../../../common/graphql/types';
import { formatUptimeGraphQLErrorList } from '../../../lib/helper/format_error_list';
import { UptimeCommonProps } from '../../../uptime_app';
import { Snapshot, SnapshotLoading } from '../../functional';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../../higher_order';
import { getSnapshotQuery } from './get_snapshot';

interface SnapshotQueryResult {
  snapshot: SnapshotType;
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
      errors,
      loading,
    } = this.props;
    const { windowWidth } = this.state;

    if (loading || !data) {
      return <SnapshotLoading />;
    }
    if (errors && errors.length) {
      formatUptimeGraphQLErrorList(errors);
    }

    const { snapshot } = data;

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
}

export const SnapshotQuery = withUptimeGraphQL<SnapshotQueryResult>(Query, getSnapshotQuery);
