/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED, AlertStatus } from '@kbn/rule-data-utils';
import { AlertStateInfo } from './alert_state_info';
import { ACTIVE_ALERT_LABEL, ALL_ALERT_LABEL, RECOVERED_ALERT_LABEL } from './constants';
import { Alert } from '../../../../../hooks/use_load_alert_summary';

export interface AlertsSummaryWidgetCompactProps {
  activeAlertCount: number;
  activeAlerts: Alert[];
  recoveredAlertCount: number;
  recoveredAlerts: Alert[];
  timeRangeTitle: JSX.Element | string;
  onClick: (status?: AlertStatus) => void;
}

export const AlertsSummaryWidgetCompact = ({
  activeAlertCount,
  activeAlerts,
  recoveredAlertCount,
  recoveredAlerts,
  timeRangeTitle,
  onClick,
}: AlertsSummaryWidgetCompactProps) => {
  const domain = {
    min: 0,
    max: Math.max(
      ...activeAlerts.map((alert) => alert.doc_count),
      ...recoveredAlerts.map((alert) => alert.doc_count)
    ),
  };

  const handleClick = (
    event: MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    status?: AlertStatus
  ) => {
    event.preventDefault();
    event.stopPropagation();

    onClick(status);
  };

  return (
    <EuiPanel
      element="div"
      data-test-subj="alertSummaryWidgetCompact"
      hasShadow={false}
      hasBorder
      onClick={handleClick}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5 data-test-subj="totalAlertsCount">
              {ALL_ALERT_LABEL}&nbsp;({activeAlertCount + recoveredAlertCount})
            </h5>
          </EuiTitle>
          {!!timeRangeTitle && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued" data-test-subj="timeRangeTitle">
                {timeRangeTitle}
              </EuiText>
            </>
          )}
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup wrap>
            {/* Active */}
            <EuiFlexItem style={{ minWidth: '200px' }}>
              <EuiLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleClick(event, ALERT_STATUS_ACTIVE)
                }
                data-test-subj="activeAlerts"
              >
                <AlertStateInfo
                  count={activeAlertCount}
                  data={activeAlerts}
                  dataTestSubj="activeAlerts"
                  domain={domain}
                  id="active"
                  stroke="#E7664C"
                  title={ACTIVE_ALERT_LABEL}
                />
              </EuiLink>
            </EuiFlexItem>
            {/* Recovered */}
            <EuiFlexItem style={{ minWidth: '200px' }}>
              <EuiLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleClick(event, ALERT_STATUS_RECOVERED)
                }
                data-test-subj="recoveredAlerts"
              >
                <AlertStateInfo
                  count={recoveredAlertCount}
                  data={recoveredAlerts}
                  dataTestSubj="recoveredAlerts"
                  domain={domain}
                  id="recovered"
                  stroke="#54B399"
                  title={RECOVERED_ALERT_LABEL}
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
