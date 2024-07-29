/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { DeploymentStatusEnum } from '../../types';
import * as i18n from './translations';

interface DeploymentStatusProps {
  status: DeploymentStatusEnum;
}

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ status }) => {
  if (status === DeploymentStatusEnum.notApplicable) {
    return null;
  }

  let statusColor: string;
  let type: string;
  let tooltip: string;

  switch (status) {
    case DeploymentStatusEnum.deployed:
      statusColor = 'success';
      type = 'dot';
      tooltip = i18n.MODEL_DEPLOYED;
      break;
    case DeploymentStatusEnum.notDeployed:
      statusColor = 'warning';
      type = 'warning';
      tooltip = i18n.MODEL_NOT_DEPLOYED;
      break;
    case DeploymentStatusEnum.notDeployable:
      statusColor = 'danger';
      type = 'dot';
      tooltip = i18n.MODEL_FAILED_TO_BE_DEPLOYED;
  }

  return (
    <EuiToolTip content={tooltip}>
      <EuiIcon
        type={type}
        data-test-subj={`table-column-deployment-${status}`}
        color={statusColor}
      />
    </EuiToolTip>
  );
};
