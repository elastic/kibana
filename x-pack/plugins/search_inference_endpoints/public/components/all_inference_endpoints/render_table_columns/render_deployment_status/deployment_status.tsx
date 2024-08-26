/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';
import { DeploymentState } from '@kbn/ml-trained-models-utils';
import * as i18n from './translations';

interface DeploymentStatusProps {
  status: DeploymentState | undefined;
}

function getStatus(status: DeploymentState | undefined) {
  switch (status) {
    case 'started':
      return {
        statusColor: 'success',
        type: 'dot',
        tooltip: i18n.MODEL_DEPLOYED,
      };

    case 'starting':
      return {
        statusColor: 'warning',
        type: 'warning',
        tooltip: i18n.MODEL_STARTING,
      };

    case 'stopping':
      return {
        statusColor: 'danger',
        type: 'dot',
        tooltip: i18n.MODEL_STOPPING,
      };

    case undefined:
      return {
        statusColor: 'danger',
        type: 'dot',
        tooltip: i18n.MODEL_NOT_DEPLOYED,
      };
  }
}

export const DeploymentStatus: React.FC<DeploymentStatusProps> = ({ status }) => {
  const { statusColor, type, tooltip } = getStatus(status);

  return (
    <EuiToolTip content={tooltip}>
      <EuiIcon
        aria-label={tooltip}
        type={type}
        data-test-subj={`table-column-deployment-${status}`}
        color={statusColor}
      />
    </EuiToolTip>
  );
};
