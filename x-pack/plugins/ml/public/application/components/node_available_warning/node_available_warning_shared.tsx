/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';

import { EuiCallOutProps } from '@elastic/eui';
import { useMlNodeCheck } from './use_ml_node_check';
import { useCloudCheck } from './use_cloud_check';
import { Warning } from './warning';

interface Props {
  nodeAvailableCallback?: (mlAvailable: boolean) => void;
  size?: EuiCallOutProps['size'];
}

export const MlNodeAvailableWarningShared: FC<Props> = ({ nodeAvailableCallback, size }) => {
  const { mlNodesAvailable } = useMlNodeCheck();
  const { isCloud, deploymentId, isCloudTrial } = useCloudCheck();

  useEffect(
    function callCallback() {
      if (typeof nodeAvailableCallback === 'function') {
        nodeAvailableCallback(mlNodesAvailable);
      }
    },
    [mlNodesAvailable, nodeAvailableCallback]
  );

  if (mlNodesAvailable) {
    return null;
  }

  return (
    <Warning
      size={size}
      isCloud={isCloud}
      isCloudTrial={isCloudTrial}
      deploymentId={deploymentId}
    />
  );
};
