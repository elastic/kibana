/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../../public/pages/metrics/inventory_view/components/toolbars/toolbar';
import { MetricsAndGroupByToolbarItems } from '../shared/components/metrics_and_groupby_toolbar_items';
import { CloudToolbarItems } from '../shared/components/cloud_toolbar_items';
import { SnapshotMetricType } from '../types';

export const rdsMetricTypes: SnapshotMetricType[] = [
  'cpu',
  'rdsConnections',
  'rdsQueriesExecuted',
  'rdsActiveTransactions',
  'rdsLatency',
];

export const rdsGroupByFields = [
  'cloud.availability_zone',
  'aws.rds.db_instance.class',
  'aws.rds.db_instance.status',
];

export const AwsRDSToolbarItems = (props: ToolbarProps) => {
  return (
    <>
      <CloudToolbarItems {...props} />
      <MetricsAndGroupByToolbarItems
        {...props}
        metricTypes={rdsMetricTypes}
        groupByFields={rdsGroupByFields}
      />
    </>
  );
};
