/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { FunctionComponent, ReactNode } from 'react';
import type { LayoutProps } from '../../public/pages/metrics/metric_detail/types';
import { Layout as AwsEC2Layout } from './aws_ec2/layout';
import { Layout as AwsRDSLayout } from './aws_rds/layout';
import { Layout as AwsS3Layout } from './aws_s3/layout';
import { Layout as AwsSQSLayout } from './aws_sqs/layout';
import { Layout as ContainerLayout } from './container/layout';
import { Layout as HostLayout } from './host/layout';
import { Layout as PodLayout } from './pod/layout';
import type { InventoryItemType } from './types';

// eslint-disable-next-line @kbn/eslint/no-restricted-paths

interface Layouts {
  [type: string]: ReactNode;
}

const layouts: Layouts = {
  host: HostLayout,
  pod: PodLayout,
  container: ContainerLayout,
  awsEC2: AwsEC2Layout,
  awsS3: AwsS3Layout,
  awsRDS: AwsRDSLayout,
  awsSQS: AwsSQSLayout,
};

export const findLayout = (type: InventoryItemType) => {
  const Layout = layouts?.[type];
  if (!Layout) {
    throw new Error(
      i18n.translate('xpack.infra.inventoryModels.findLayout.error', {
        defaultMessage: "The layout you've attempted to find does not exist",
      })
    );
  }
  return Layout as FunctionComponent<LayoutProps>;
};
