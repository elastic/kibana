/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars } from '@kbn/ui-theme';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertsSummaryWidgetUIProps } from './types';

export const AlertsSummaryWidgetUI = ({
  active,
  recovered,
  timeRange,
}: AlertsSummaryWidgetUIProps) => {
  return (
    <EuiPanel data-test-subj="ruleAlertsSummary" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h5>
                  <FormattedMessage
                    id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.title"
                    defaultMessage="Alerts"
                  />
                </h5>
              </EuiTitle>
              {!!timeRange && (
                <>
                  <EuiSpacer size="s" />
                  <EuiText size="s" color="subdued">
                    {timeRange}
                  </EuiText>
                </>
              )}
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
                <EuiFlexItem>
                  <EuiText>
                    <h3 data-test-subj="totalAlertsCount">{active + recovered}</h3>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.allAlertsLabel"
                      defaultMessage="All"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText color={euiLightVars.euiColorSuccessText}>
                      <h3 data-test-subj="recoveredAlertsCount">{recovered}</h3>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.rule.ruleSummary.recoveredLabel"
                      defaultMessage="Recovered"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color={euiLightVars.euiColorDangerText}>
                    <h3 data-test-subj="activeAlertsCount">{active}</h3>
                  </EuiText>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeLabel"
                      defaultMessage="Currently active"
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
