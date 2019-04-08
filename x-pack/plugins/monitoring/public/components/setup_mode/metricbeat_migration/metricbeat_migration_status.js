/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexItem,
  EuiBadge
} from '@elastic/eui';

export const MetricbeatMigrationStatus = ({ data }) => {
  if (!data) {
    return null;
  }

  let color = 'warning';
  if (data.isFullyMigrated) {
    color = 'secondary';
  }
  else if (data.isInternalCollector) {
    color = 'danger';
  }
  else if (data.isPartiallyMigrated) {
    color = 'primary';
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiBadge
        color={color}
      >
        {data.totalUniqueFullyMigratedCount.length}/{data.totalUniqueInstanceCount}
      </EuiBadge>
    </EuiFlexItem>
  );
};
