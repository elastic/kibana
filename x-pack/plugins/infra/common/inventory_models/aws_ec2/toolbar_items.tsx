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

export const AwsEC2ToolbarItems = (props: ToolbarProps) => {
  const metricTypes: SnapshotMetricType[] = [
    'cpu',
    'rx',
    'tx',
    'diskIOReadBytes',
    'diskIOWriteBytes',
  ];
  const groupByFields = [
    'cloud.availability_zone',
    'cloud.machine.type',
    'aws.ec2.instance.image.id',
    'aws.ec2.instance.state.name',
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
