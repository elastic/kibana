/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { LayoutProps } from '../types';
import { AwsEC2Layout } from './layouts/aws_ec2_layout';
import { AwsRDSLayout } from './layouts/aws_rds_layout';
import { AwsS3Layout } from './layouts/aws_s3_layout';
import { AwsSQSLayout } from './layouts/aws_sqs_layout';
import { ContainerLayout } from './layouts/container_layout';
import { PodLayout } from './layouts/pod_layout';

export const Layout = ({
  inventoryItemType,
  ...layoutProps
}: LayoutProps & { inventoryItemType: InventoryItemType }) => {
  switch (inventoryItemType) {
    case 'awsEC2':
      return <AwsEC2Layout {...layoutProps} />;
    case 'awsRDS':
      return <AwsRDSLayout {...layoutProps} />;
    case 'awsS3':
      return <AwsS3Layout {...layoutProps} />;
    case 'awsSQS':
      return <AwsSQSLayout {...layoutProps} />;
    case 'container':
      return <ContainerLayout {...layoutProps} />;
    case 'pod':
      return <PodLayout {...layoutProps} />;
    default:
      throw new Error(`${inventoryItemType} is not supported.`);
  }
};
