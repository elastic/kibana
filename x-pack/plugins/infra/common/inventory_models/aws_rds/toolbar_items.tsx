/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../../public/components/inventory/toolbars/toolbar';
import { MetricsAndGroupByToolbarItems } from '../shared/compontents/metrics_and_groupby_toolbar_items';
import { CloudToolbarItems } from '../shared/compontents/cloud_toolbar_items';
import { SnapshotMetricType } from '../types';

export const AwsRDSToolbarItems = (props: ToolbarProps) => {
  const metricTypes: SnapshotMetricType[] = [
    'cpu',
    'rdsConnections',
    'rdsQueriesExecuted',
    'rdsActiveTransactions',
    'rdsLatency',
  ];
  const groupByFields = [
    'cloud.availability_zone',
    'aws.rds.db_instance.class',
    'aws.rds.db_instance.status',
  ];
  return (
    <>
      <CloudToolbarItems {...props} />
      <MetricsAndGroupByToolbarItems
        {...props}
        metricTypes={metricTypes}
        groupByFields={groupByFields}
      />
    </>
  );
};
