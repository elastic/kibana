/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import {
  SnapshotMetricInput,
  SnapshotCustomMetricInput,
} from '../../../../common/http_api/snapshot_api';

export const useInventoryAlertPrefill = () => {
  const [nodeType, setNodeType] = useState<InventoryItemType>('host');
  const [filterQuery, setFilterQuery] = useState<string | undefined>();
  const [metric, setMetric] = useState<SnapshotMetricInput>({ type: 'cpu' });
  const [customMetrics, setCustomMetrics] = useState<SnapshotCustomMetricInput[]>([]);
  // only shows for AWS when there are regions info
  const [region, setRegion] = useState('');
  // only shows for AWS when there are accounts info
  const [accountId, setAccountId] = useState('');

  return {
    nodeType,
    filterQuery,
    metric,
    customMetrics,
    accountId,
    region,
    setAccountId,
    setNodeType,
    setFilterQuery,
    setMetric,
    setCustomMetrics,
    setRegion,
  };
};
