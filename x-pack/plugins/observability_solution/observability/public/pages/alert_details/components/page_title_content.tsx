/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { EuiFlexGroup, EuiFlexItem, EuiText, useEuiTheme } from '@elastic/eui';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { AlertStatus, ALERT_DURATION, ALERT_FLAPPING, TIMESTAMP } from '@kbn/rule-data-utils';
import { css } from '@emotion/react';
import { asDuration } from '../../../../common/utils/formatters';
import { TopAlert } from '../../../typings/alerts';

export interface PageTitleContentProps {
  alert: TopAlert | null;
  alertStatus?: AlertStatus;
  dataTestSubj: string;
}

export function PageTitleContent({ alert, alertStatus, dataTestSubj }: PageTitleContentProps) {
  const { euiTheme } = useEuiTheme();

  if (!alert) {
    return null;
  }

  return (
    <EuiFlexGroup direction="row" alignItems="center" gutterSize="xl" data-test-subj={dataTestSubj}>
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
  );
}
