/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { awsEC2SnapshotMetricTypes } from '../../../../../../common/inventory_models/aws_ec2';
import { MetricsAndGroupByToolbarItems } from './metrics_and_groupby_toolbar_items';
import { CloudToolbarItems } from './cloud_toolbar_items';
import { ToolbarProps } from './types';

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
        metricTypes={awsEC2SnapshotMetricTypes}
        groupByFields={ec2groupByFields}
      />
    </>
  );
};
