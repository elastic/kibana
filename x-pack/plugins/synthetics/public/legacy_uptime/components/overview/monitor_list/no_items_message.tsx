/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSelector } from 'react-redux';
import * as labels from './translations';
import { useGetUrlParams } from '../../../hooks';
import { selectPingHistogram } from '../../../state/selectors';
import { TroubleshootPopover } from './troubleshoot_popover';

export const NoItemsMessage = ({ loading, filters }: { loading: boolean; filters?: string }) => {
  const { statusFilter } = useGetUrlParams();

  const { pingHistogram } = useSelector(selectPingHistogram);

  const hasPingsData = pingHistogram?.histogram && pingHistogram.histogram.length > 0;

  const clockSyncError = hasPingsData && !statusFilter ? <TroubleshootPopover /> : null;

  if (loading) {
    return <> {labels.LOADING}</>;
  }

  if (filters) {
    return (
      <>
        <EuiFlexGroup alignItems="center" gutterSize="xs">
          <EuiFlexItem grow={false}>{labels.NO_MONITOR_ITEM_SELECTED}</EuiFlexItem>
          <EuiFlexItem grow={false}>{clockSyncError}</EuiFlexItem>
        </EuiFlexGroup>
      </>
    );
  }

  return (
    <>
      {labels.NO_DATA_MESSAGE}
      {clockSyncError}
    </>
  );
};
