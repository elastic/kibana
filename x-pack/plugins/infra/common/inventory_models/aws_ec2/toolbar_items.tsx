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

export const ec2MetricTypes: SnapshotMetricType[] = [
  'cpu',
  'rx',
  'tx',
  'diskIOReadBytes',
  'diskIOWriteBytes',
];

export const ec2groupByFields = [
  'cloud.availability_zone',
  'cloud.machine.type',
  'aws.ec2.instance.image.id',
  'aws.ec2.instance.state.name',
];

export const AwsEC2ToolbarItems = (props: ToolbarProps) => {
  return (
    <>
      <CloudToolbarItems {...props} />
      <MetricsAndGroupByToolbarItems
        {...props}
        metricTypes={ec2MetricTypes}
        groupByFields={ec2groupByFields}
      />
    </>
  );
};
