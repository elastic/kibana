/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReactNode, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { InventoryItemType } from './types';
import { HostToolbarItems } from './host/toolbar_items';
import { ContainerToolbarItems } from './container/toolbar_items';
import { PodToolbarItems } from './pod/toolbar_items';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ToolbarProps } from '../../public/components/inventory/toolbars/toolbar';
import { AwsEC2ToolbarItems } from './aws_ec2/toolbar_items';
import { AwsS3ToolbarItems } from './aws_s3/toolbar_items';
import { AwsRDSToolbarItems } from './aws_rds/toolbar_items';
import { AwsSQSToolbarItems } from './aws_sqs/toolbar_items';

interface Toolbars {
  [type: string]: ReactNode;
}

const toolbars: Toolbars = {
  host: HostToolbarItems,
  container: ContainerToolbarItems,
  pod: PodToolbarItems,
  awsEC2: AwsEC2ToolbarItems,
  awsS3: AwsS3ToolbarItems,
  awsRDS: AwsRDSToolbarItems,
  awsSQS: AwsSQSToolbarItems,
};

export const findToolbar = (type: InventoryItemType) => {
  const Toolbar = toolbars?.[type];
  if (!Toolbar) {
    throw new Error(
      i18n.translate('xpack.infra.inventoryModels.findToolbar.error', {
        defaultMessage: "The toolbar you've attempted to find does not exist.",
      })
    );
  }
  return Toolbar as FunctionComponent<ToolbarProps>;
};
