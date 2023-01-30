/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import type { MlSummaryJob } from '@kbn/ml-plugin/public';

enum MessageLevels {
  info = 'info',
  warning = 'warning',
  error = 'error',
}

interface MlAuditIconProps {
  message: MlSummaryJob['auditMessage'];
}

const MlAuditIconComponent: FC<MlAuditIconProps> = ({ message }) => {
  if (!message) {
    return null;
  }

  let color = 'primary';
  let icon = 'alert';

  if (message.level === MessageLevels.info) {
    icon = 'iInCircle';
  } else if (message.level === MessageLevels.warning) {
    color = 'warning';
  } else if (message.level === MessageLevels.error) {
    color = 'danger';
  }

  return (
    <EuiToolTip content={message.text}>
      <EuiIcon data-test-subj="mlJobAuditIcon" type={icon} color={color} />
    </EuiToolTip>
  );
};

export const MlAuditIcon = memo(MlAuditIconComponent);
