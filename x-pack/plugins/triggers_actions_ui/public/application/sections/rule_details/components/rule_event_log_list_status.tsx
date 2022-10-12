/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIcon } from '@elastic/eui';
import { RuleAlertingOutcome } from '@kbn/alerting-plugin/common';

interface RuleEventLogListStatusProps {
  status: RuleAlertingOutcome;
}

const statusContainerStyles = {
  display: 'flex',
  alignItems: 'center',
  textTransform: 'capitalize' as const,
};

const iconStyles = {
  marginRight: '8px',
};

const STATUS_TO_COLOR: Record<RuleAlertingOutcome, string> = {
  success: 'success',
  failure: 'danger',
  unknown: 'gray',
  warning: 'warning',
};

export const RuleEventLogListStatus = (props: RuleEventLogListStatusProps) => {
  const { status } = props;
  const color = STATUS_TO_COLOR[status] || 'gray';

  return (
    <div style={statusContainerStyles}>
      <EuiIcon type="dot" color={color} style={iconStyles} />
      {status}
    </div>
  );
};
