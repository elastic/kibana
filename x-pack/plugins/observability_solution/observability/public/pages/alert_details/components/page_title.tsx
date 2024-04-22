/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  AlertStatus,
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { css } from '@emotion/react';
import { asDuration } from '../../../../common/utils/formatters';
import { TopAlert } from '../../../typings/alerts';
import { ExperimentalBadge } from '../../../components/experimental_badge';
import { METRIC_THRESHOLD_ALERT_TYPE_ID } from '../alert_details';
import { isAlertDetailsEnabledPerApp } from '../../../utils/is_alert_details_enabled';
import { usePluginContext } from '../../../hooks/use_plugin_context';

export interface PageTitleProps {
  alert: TopAlert | null;
  alertStatus?: AlertStatus;
  dataTestSubj: string;
}

export function pageTitleContent(ruleCategory: string) {
  return i18n.translate('xpack.observability.pages.alertDetails.pageTitle.title', {
    defaultMessage:
      '{ruleCategory} {ruleCategory, select, Anomaly {detected} Inventory {threshold breached} other {breached}}',
    values: {
      ruleCategory,
    },
  });
}

export function PageTitle({ alert, alertStatus, dataTestSubj }: PageTitleProps) {
  const { euiTheme } = useEuiTheme();
  const { config } = usePluginContext();

  if (!alert) return <EuiLoadingSpinner />;

  const showExperimentalBadge = alert.fields[ALERT_RULE_TYPE_ID] === METRIC_THRESHOLD_ALERT_TYPE_ID;

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
        {pageTitleContent(alert.fields[ALERT_RULE_CATEGORY])}
        {isAlertDetailsEnabledPerApp(alert, config) && showExperimentalBadge && (
          <ExperimentalBadge />
        )}
      </EuiFlexGroup>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xl">
        <EuiFlexItem grow={false}>
          {alertStatus && (
            <AlertLifecycleStatusBadge
              alertStatus={alertStatus}
              flapping={alert.fields[ALERT_FLAPPING]}
            />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.pageTitle.triggered"
                defaultMessage="Triggered"
              />
              :&nbsp;
            </EuiText>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {moment(Number(alert.start)).locale(i18n.getLocale()).fromNow()}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.pageTitle.duration"
                defaultMessage="Duration"
              />
              :&nbsp;
            </EuiText>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {asDuration(Number(alert.fields[ALERT_DURATION]))}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.pageTitle.lastStatusUpdate"
                defaultMessage="Last status update"
              />
              :&nbsp;
            </EuiText>
            <EuiText
              css={css`
                font-weight: ${euiTheme.font.weight.semiBold};
              `}
              size="s"
            >
              {moment(alert.fields[TIMESTAMP]?.toString()).locale(i18n.getLocale()).fromNow()}
            </EuiText>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
