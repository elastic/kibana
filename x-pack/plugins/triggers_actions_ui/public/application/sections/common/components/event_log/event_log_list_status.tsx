/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiIcon } from '@elastic/eui';
import { RuleAlertingOutcome } from '@kbn/alerting-plugin/common';
import {
  RULE_LAST_RUN_OUTCOME_SUCCEEDED,
  RULE_LAST_RUN_OUTCOME_FAILED,
  RULE_LAST_RUN_OUTCOME_WARNING,
  ALERT_STATUS_UNKNOWN,
} from '../../../rules_list/translations';

interface EventLogListStatusProps {
  status: RuleAlertingOutcome;
  useExecutionStatus?: boolean;
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

const STATUS_TO_OUTCOME: Record<RuleAlertingOutcome, string> = {
  success: RULE_LAST_RUN_OUTCOME_SUCCEEDED,
  failure: RULE_LAST_RUN_OUTCOME_FAILED,
  warning: RULE_LAST_RUN_OUTCOME_WARNING,
  unknown: ALERT_STATUS_UNKNOWN,
};

export const EventLogListStatus = (props: EventLogListStatusProps) => {
  const { status, useExecutionStatus = true } = props;
  const color = STATUS_TO_COLOR[status] || 'gray';

  const statusString = useMemo(() => {
    if (useExecutionStatus) {
      return status;
    }
    return STATUS_TO_OUTCOME[status].toLocaleLowerCase();
  }, [useExecutionStatus, status]);

  return (
    <div style={statusContainerStyles}>
      <EuiIcon type="dot" color={color} style={iconStyles} />
      {statusString}
    </div>
  );
};
