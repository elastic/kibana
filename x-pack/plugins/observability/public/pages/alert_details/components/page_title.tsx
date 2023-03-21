/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ALERT_DURATION, TIMESTAMP } from '@kbn/rule-data-utils';
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

  const label = Boolean(alert.active)
    ? i18n.translate('xpack.observability.alertDetails.alertActiveState', {
        defaultMessage: 'Active',
      })
    : i18n.translate('xpack.observability.alertDetails.alertRecoveredState', {
        defaultMessage: 'Recovered',
      });

  return (
    <div data-test-subj="page-title-container">
      {alert.reason}
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="xl">
        <EuiFlexItem grow={false}>
          {typeof Boolean(alert.active) === 'boolean' ? (
            <EuiBadge color="#BD271E" data-test-subj="page-title-active-badge">
              {label}
            </EuiBadge>
          ) : null}
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
