/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../../public/pages/metrics/inventory_view/components/toolbars/toolbar';
import { MetricsAndGroupByToolbarItems } from '../shared/components/metrics_and_groupby_toolbar_items';
import { CloudToolbarItems } from '../shared/components/cloud_toolbar_items';
import { SnapshotMetricType } from '../types';

export const s3MetricTypes: SnapshotMetricType[] = [
  's3BucketSize',
  's3NumberOfObjects',
  's3TotalRequests',
  's3DownloadBytes',
  's3UploadBytes',
];

export const s3GroupByFields = ['cloud.region'];

export const AwsS3ToolbarItems = (props: ToolbarProps) => {
  return (
    <>
      <CloudToolbarItems {...props} />
      <MetricsAndGroupByToolbarItems
        {...props}
        metricTypes={s3MetricTypes}
        groupByFields={s3GroupByFields}
      />
    </>
  );
};
