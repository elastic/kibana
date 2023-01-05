/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { InventoryItemType } from '../../../../../../common/inventory_models/types';
import { useSourceContext } from '../../../../../containers/metrics_source';
import { useInventoryMeta } from '../../hooks/use_inventory_meta';
import { AwsEC2ToolbarItems } from './aws_ec2_toolbar_items';
import { AwsRDSToolbarItems } from './aws_rds_toolbar_items';
import { AwsS3ToolbarItems } from './aws_s3_toolbar_items';
import { AwsSQSToolbarItems } from './aws_sqs_toolbar_items';
import { ContainerToolbarItems } from './container_toolbar_items';
import { HostToolbarItems } from './host_toolbar_items';
import { PodToolbarItems } from './pod_toolbar_items';
import { ToolbarWrapper } from './toolbar_wrapper';
import { ToolbarProps } from './types';

interface Props {
  nodeType: InventoryItemType;
  currentTime: number;
}

export const Toolbar = ({ nodeType, currentTime }: Props) => {
  const { sourceId } = useSourceContext();
  const { accounts, regions } = useInventoryMeta(sourceId, nodeType, currentTime);

  return (
    <ToolbarWrapper>
      {(props) => (
        <>
          <ToolbarItems {...props} accounts={accounts} regions={regions} />
          <EuiFlexItem grow={true} />
        </>
      )}
    </ToolbarWrapper>
  );
};

export const ToolbarItems = (props: ToolbarProps) => {
  switch (props.nodeType) {
    case 'awsEC2':
      return <AwsEC2ToolbarItems {...props} />;
    case 'awsRDS':
      return <AwsRDSToolbarItems {...props} />;
    case 'awsS3':
      return <AwsS3ToolbarItems {...props} />;
    case 'awsSQS':
      return <AwsSQSToolbarItems {...props} />;
    case 'container':
      return <ContainerToolbarItems {...props} />;
    case 'host':
      return <HostToolbarItems {...props} />;
    case 'pod':
      return <PodToolbarItems {...props} />;
  }
};
