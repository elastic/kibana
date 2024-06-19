/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHealth } from '@elastic/eui';
import { DeploymentStatusEnum } from '../../types';

interface DeploymentStatusProps {
  status: DeploymentStatusEnum;
}

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ status }) => {
  if (status === DeploymentStatusEnum.notApplicable) {
    return null;
  }

  let statusColor: string;

  switch (status) {
    case DeploymentStatusEnum.deployed:
      statusColor = 'success';
      break;
    case DeploymentStatusEnum.notDeployed:
      statusColor = 'warning';
      break;
    default:
      statusColor = 'danger';
  }

  return <EuiHealth color={statusColor} />;
};
