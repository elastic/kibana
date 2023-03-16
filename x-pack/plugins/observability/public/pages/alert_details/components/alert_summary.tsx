/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { ReactNode } from 'react';
import {
  EuiText,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGrid,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import {
  ALERT_DURATION,
  ALERT_RULE_TAGS,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { asDuration } from '../../../../common/utils/formatters';
import { AlertStatusIndicator } from '../../../components/shared/alert_status_indicator';
import type { TopAlert } from '../../../typings/alerts';

export interface AlertSummaryField {
  label: ReactNode | string;
  value: string | number;
}
export interface AlertSummaryProps {
  alert: TopAlert | null;
  alertSummaryFields?: AlertSummaryField[];
}

const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

const getAndFormatAlertSummaryBasicFields = (alert: TopAlert | null): React.ReactElement => {
  const tags = alert?.fields[ALERT_RULE_TAGS];
  return (
    <>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary.alertStatus"
              defaultMessage="Status"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        {alert?.fields[ALERT_STATUS] ? (
          <AlertStatusIndicator
            textSize="s"
            alertStatus={
              alert.fields[ALERT_STATUS] === ALERT_STATUS_ACTIVE
                ? ALERT_STATUS_ACTIVE
                : ALERT_STATUS_RECOVERED
            }
          />
        ) : (
          <div data-test-subj="noAlertStatus">-</div>
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary.duration"
              defaultMessage="Duration"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {asDuration(Number(alert?.fields[ALERT_DURATION]))}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary.started"
              defaultMessage="Started"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {moment(alert?.fields[ALERT_START]?.toString()).format(DEFAULT_DATE_FORMAT)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary.lastStatusUpdate"
              defaultMessage="Last status update"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {moment(alert?.fields[TIMESTAMP]?.toString()).fromNow()},&nbsp;
          {moment(alert?.fields[TIMESTAMP]?.toString()).format(DEFAULT_DATE_FORMAT)}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.observability.pages.alertDetails.alertSummary.ruleTags"
              defaultMessage="Rule Tags"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <div>
          {tags && tags.length > 0 ? (
            <EuiBadgeGroup>
              {tags.map((tag, index) => (
                <EuiBadge data-test-subj={`ruleTagBadge-${tag}`} key={index} color="hollow">
                  <EuiText size="s">{tag}</EuiText>
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          ) : (
            <div data-test-subj="noRuleTags">-</div>
          )}
        </div>
      </EuiFlexItem>
    </>
  );
};
export function AlertSummary({ alert, alertSummaryFields }: AlertSummaryProps) {
  const isMobile = useIsWithinBreakpoints(['xs', 's']);
  return (
    <EuiFlexGrid
      responsive={false}
      data-test-subj="alert-summary-container"
      style={{
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)',
      }}
    >
      {getAndFormatAlertSummaryBasicFields(alert)}
      {alertSummaryFields?.map((field) => {
        return (
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h5>{field.label}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              {field.value}
            </EuiText>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGrid>
  );
}
