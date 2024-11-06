/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import React from 'react';
import { BulkOperations } from './bulk_operations';
import { EncryptedSyntheticsSavedMonitor } from '../../../../../../../common/runtime_types';

export const MonitorListHeader = ({
  selectedItems,
  recordRangeLabel,
  setMonitorPendingDeletion,
}: {
  recordRangeLabel: JSX.Element;
  selectedItems: EncryptedSyntheticsSavedMonitor[];
  setMonitorPendingDeletion: (val: string[]) => void;
}) => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        <span>{recordRangeLabel}</span>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <BulkOperations
          selectedItems={selectedItems}
          setMonitorPendingDeletion={setMonitorPendingDeletion}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
