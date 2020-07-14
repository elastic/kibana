/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState } from 'react';
import { SnapshotMetricInput } from '../../../../common/http_api/snapshot_api';
import { InventoryItemType } from '../../../../common/inventory_models/types';

export const useInventoryAlertPrefill = () => {
  const [nodeType, setNodeType] = useState<InventoryItemType>('host');
  const [filterQuery, setFilterQuery] = useState<string | undefined>();
  const [metric, setMetric] = useState<SnapshotMetricInput>({ type: 'cpu' });

  return {
    nodeType,
    filterQuery,
    metric,
    setNodeType,
    setFilterQuery,
    setMetric,
  };
};
