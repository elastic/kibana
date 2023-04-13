/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { ALERT_STATUS_ACTIVE, AlertStatus } from '@kbn/rule-data-utils';
import { ActiveAlertCounts } from './active_alert_counts';
import { AllAlertCounts } from './all_alert_counts';

interface Props {
  activeAlertCount: number;
  recoveredAlertCount: number;
  onActiveClick?: (
    event: MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    status?: AlertStatus
  ) => void;
}

export const AlertCounts = ({ activeAlertCount, recoveredAlertCount, onActiveClick }: Props) => {
  return (
    <EuiFlexGroup gutterSize="l" responsive={false}>
      <EuiFlexItem style={{ minWidth: 50, wordWrap: 'break-word' }} grow={false}>
        <AllAlertCounts count={activeAlertCount + recoveredAlertCount} />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: 50, wordWrap: 'break-word' }} grow={false}>
        {!!onActiveClick ? (
          <EuiLink
            onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
              onActiveClick(event, ALERT_STATUS_ACTIVE)
            }
            data-test-subj="activeAlerts"
          >
            <ActiveAlertCounts activeAlertCount={activeAlertCount} />
          </EuiLink>
        ) : (
          <ActiveAlertCounts activeAlertCount={activeAlertCount} />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
