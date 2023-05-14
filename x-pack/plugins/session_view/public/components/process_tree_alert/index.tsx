/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
  EuiIcon,
  EuiText,
  EuiButtonIcon,
  EuiToolTip,
  EuiPanel,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_ICONS } from '../../../common/constants';
import {
  ProcessEvent,
  ProcessEventAlert,
  ProcessEventAlertCategory,
} from '../../../common/types/process_tree';
import { dataOrDash } from '../../utils/data_or_dash';
import { getBadgeColorFromAlertStatus } from './helpers';
import { useStyles } from './styles';
import { getAlertCategoryDisplayText } from '../../utils/alert_category_display_text';
import { getAlertIconTooltipContent } from '../../../common/utils/alert_icon_tooltip_content';
export interface ProcessTreeAlertDeps {
  alert: ProcessEvent;
  isInvestigated: boolean;
  isSelected: boolean;
  onClick: (alert: ProcessEventAlert | null) => void;
  selectAlert: (alertUuid: string) => void;
  onShowAlertDetails: (alertUuid: string) => void;
}

export const ProcessTreeAlert = ({
  alert,
  isInvestigated,
  isSelected,
  onClick,
  selectAlert,
  onShowAlertDetails,
}: ProcessTreeAlertDeps) => {
  const styles = useStyles({ isInvestigated, isSelected });

  const { event } = alert;
  const { uuid, rule, workflow_status: status } = alert.kibana?.alert || {};
  const category = event?.category?.[0];
  const alertIconType = useMemo(() => {
    if (category && category in ALERT_ICONS) return ALERT_ICONS[category];
    return ALERT_ICONS.process;
  }, [category]);

  useEffect(() => {
    if (isInvestigated && uuid) {
      selectAlert(uuid);
    }
  }, [isInvestigated, uuid, selectAlert]);

  const handleExpandClick = useCallback(() => {
    if (uuid) {
      onShowAlertDetails(uuid);
    }
  }, [onShowAlertDetails, uuid]);

  const handleClick = useCallback(() => {
    if (alert.kibana?.alert) {
      onClick(alert.kibana.alert);
    }
  }, [alert.kibana?.alert, onClick]);

  if (!(alert.kibana && rule)) {
    return null;
  }
  const { name } = rule;
  const processEventAlertCategory = category ?? ProcessEventAlertCategory.process;
  const alertCategoryDetailDisplayText = getAlertCategoryDisplayText(alert, category);
  const alertIconTooltipContent = getAlertIconTooltipContent(processEventAlertCategory);
  const eventType = Array.isArray(event?.type) ? event?.type?.[0] : event?.type;

  return (
    <div key={uuid} css={styles.alert} data-id={uuid}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        wrap
        onClick={handleClick}
        data-test-subj={`sessionView:sessionViewAlertDetail-${uuid}`}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="expand"
            aria-label="expand"
            data-test-subj={`sessionView:sessionViewAlertDetailExpand-${uuid}`}
            onClick={handleExpandClick}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip position="top" content={alertIconTooltipContent}>
            <EuiIcon type={alertIconType} color="danger" />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div css={styles.processAlertDisplayContainer}>
            <EuiText
              data-test-subj={`sessionView:sessionViewAlertDetailRuleName-${uuid}-text`}
              css={styles.alertName}
              size="s"
            >
              {dataOrDash(name)}
            </EuiText>
            {alertCategoryDetailDisplayText && (
              <EuiPanel
                css={styles.processPanel}
                color="subdued"
                hasBorder
                hasShadow={false}
                borderRadius="m"
              >
                <EuiText
                  data-test-subj={`sessionView:sessionViewAlertDetail-${uuid}-text`}
                  css={styles.alertName}
                  size="s"
                >
                  <span className="alertCategoryDetailText">{alertCategoryDetailDisplayText}</span>
                </EuiText>
              </EuiPanel>
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={getBadgeColorFromAlertStatus(status)} css={styles.alertStatus}>
            {dataOrDash(status)}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge css={styles.actionBadge}>{event?.action}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          {eventType === 'denied' && (
            <EuiBadge css={styles.actionBadge} color="danger">
              <FormattedMessage id="xpack.sessionView.blockedBadge" defaultMessage="Blocked" />
            </EuiBadge>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
