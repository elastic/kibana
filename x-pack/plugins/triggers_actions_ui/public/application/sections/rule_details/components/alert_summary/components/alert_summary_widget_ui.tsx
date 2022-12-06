/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import { euiLightVars } from '@kbn/ui-theme';
import {
  EuiFacetButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { MouseEvent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertsSummaryWidgetUIProps } from './types';

const onClickWrapper = (
  event: MouseEvent<HTMLButtonElement | HTMLDivElement>,
  onClick: () => void
) => {
  event.preventDefault();
  event.stopPropagation();

  onClick();
};

export const AlertsSummaryWidgetUI = ({
  active,
  recovered,
  timeRange,
  onClick,
}: AlertsSummaryWidgetUIProps) => {
  return (
    <EuiPanel
      element="div"
      data-test-subj="ruleAlertsSummary"
      hasShadow={false}
      hasBorder
      onClick={(event: MouseEvent<HTMLDivElement>) => onClickWrapper(event, onClick)}
    >
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
                  <EuiFacetButton onClick={(event) => onClickWrapper(event, onClick)}>
                    <EuiText>
                      <h3 data-test-subj="totalAlertsCount">{active + recovered}</h3>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.allAlertsLabel"
                        defaultMessage="All"
                      />
                    </EuiText>
                  </EuiFacetButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFacetButton
                    onClick={(event) =>
                      onClickWrapper(event, () => onClick(ALERT_STATUS_RECOVERED))
                    }
                  >
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
                  </EuiFacetButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFacetButton
                    onClick={(event) => onClickWrapper(event, () => onClick(ALERT_STATUS_ACTIVE))}
                  >
                    <EuiText color={euiLightVars.euiColorDangerText}>
                      <h3 data-test-subj="activeAlertsCount">{active}</h3>
                    </EuiText>
                    <EuiText size="xs" color="subdued">
                      <FormattedMessage
                        id="xpack.triggersActionsUI.sections.ruleDetails.alertsSummary.activeLabel"
                        defaultMessage="Currently active"
                      />
                    </EuiText>
                  </EuiFacetButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
