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
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertStateInfo } from './alert_state_info';
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
      data-test-subj="alertSummaryWidget"
      hasShadow={false}
      hasBorder
      onClick={handleClick}
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5 data-test-subj="totalAlertsCount">
              <FormattedMessage
                id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.title"
                defaultMessage="Alerts"
              />
              &nbsp;({activeAlertCount + recoveredAlertCount})
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
              >
                <AlertStateInfo
                  count={activeAlertCount}
                  data={activeAlerts}
                  dataTestSubj="activeAlertsCount"
                  domain={domain}
                  id="active"
                  stroke="#E7664C"
                  title={
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeLabel"
                      defaultMessage="Active"
                    />
                  }
                />
              </EuiLink>
            </EuiFlexItem>
            {/* Recovered */}
            <EuiFlexItem style={{ minWidth: '200px' }}>
              <EuiLink
                onClick={(event: React.MouseEvent<HTMLAnchorElement>) =>
                  handleClick(event, ALERT_STATUS_RECOVERED)
                }
              >
                <AlertStateInfo
                  count={recoveredAlertCount}
                  data={recoveredAlerts}
                  dataTestSubj="recoveredAlertsCount"
                  domain={domain}
                  id="recovered"
                  stroke="#54B399"
                  title={
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredLabel"
                      defaultMessage="Recovered"
                    />
                  }
                />
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
