/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type MouseEvent } from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { ALERT_STATUS_ACTIVE, AlertStatus } from '@kbn/rule-data-utils';
import {
  ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ,
  ACTIVE_NOW_LABEL,
  ALERTS_LABEL,
  ALL_ALERT_COLOR,
  TOTAL_ALERT_COUNT_DATA_TEST_SUBJ,
} from './constants';
import { AlertItem } from './alert_item';

interface Props {
  activeAlertCount: number;
  recoveredAlertCount: number;
  handleClick?: (
    event: MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    status?: AlertStatus
  ) => void;
}

export const AlertCounts = ({ activeAlertCount, recoveredAlertCount, handleClick }: Props) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup gutterSize="l" responsive={false}>
      <AlertItem
        label={ALERTS_LABEL}
        count={activeAlertCount + recoveredAlertCount}
        color={ALL_ALERT_COLOR}
        data-test-subj={TOTAL_ALERT_COUNT_DATA_TEST_SUBJ}
        handleClick={handleClick}
      />
      <AlertItem
        label={ACTIVE_NOW_LABEL}
        count={activeAlertCount}
        color={activeAlertCount > 0 ? euiTheme.colors.dangerText : euiTheme.colors.textSuccess}
        alertType={ALERT_STATUS_ACTIVE}
        handleClick={handleClick}
        showWarningIcon={true}
        data-test-subj={ACTIVE_ALERT_COUNT_DATA_TEST_SUBJ}
      />
    </EuiFlexGroup>
  );
};
