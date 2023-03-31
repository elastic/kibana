/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  ALERT_DURATION,
  ALERT_FLAPPING,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import moment from 'moment';
import { css } from '@emotion/react';
import { asDuration } from '../../../../common/utils/formatters';
import { TopAlert } from '../../../typings/alerts';

export interface PageTitleProps {
  alert: TopAlert | null;
}

export function PageTitle({ alert }: PageTitleProps) {
  const { euiTheme } = useEuiTheme();

  if (!alert) return <EuiLoadingSpinner />;

  return (
    <div data-test-subj="page-title-container">
      {alert.reason}
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xl">
        <EuiFlexItem grow={false}>
          <AlertLifecycleStatusBadge
            alertStatus={alert.active ? ALERT_STATUS_ACTIVE : ALERT_STATUS_RECOVERED}
            flapping={alert.fields[ALERT_FLAPPING]}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="none">
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.alertSummary.triggered"
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
                id="xpack.observability.pages.alertDetails.alertSummary.duration"
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
                id="xpack.observability.pages.alertDetails.alertSummary.lastStatusUpdate"
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
