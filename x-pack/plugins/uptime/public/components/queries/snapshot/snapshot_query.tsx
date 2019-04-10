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

type Props = UptimeCommonProps & UptimeGraphQLQueryProps<SnapshotQueryResult>;

const Query = (props: Props) => {
  const {
    colors: { success, danger },
    data,
  } = props;
  if (data && data.snapshot) {
    return <Snapshot dangerColor={danger} successColor={success} snapshot={data.snapshot} />;
  }
  return <SnapshotLoading />;
};

export const SnapshotQuery = withUptimeGraphQL<SnapshotQueryResult>(Query, getSnapshotQuery);
