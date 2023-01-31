/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiBadge,
  EuiBadgeGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import moment from 'moment';
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { formatAlertEvaluationValue } from '../../../utils/format_alert_evaluation_value';
import { asDuration } from '../../../../common/utils/formatters';
import { AlertSummaryProps } from '../types';
import { AlertStatusIndicator } from '../../../components/shared/alert_status_indicator';
import { DEFAULT_DATE_FORMAT } from '../constants';

export function AlertSummary({ alert }: AlertSummaryProps) {
  const tags = alert?.fields[ALERT_RULE_TAGS];
  return (
    <div data-test-subj="alert-summary-container">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.alertSummary.actualValue"
                defaultMessage="Actual value"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {formatAlertEvaluationValue(
              alert?.fields[ALERT_RULE_TYPE_ID],
              alert?.fields[ALERT_EVALUATION_VALUE]
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.alertSummary.expectedValue"
                defaultMessage="Expected value"
              />
            </h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {formatAlertEvaluationValue(
              alert?.fields[ALERT_RULE_TYPE_ID],
              alert?.fields[ALERT_EVALUATION_THRESHOLD]
            )}
          </EuiText>
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
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h5>
              <FormattedMessage
                id="xpack.observability.pages.alertDetails.alertSummary.source"
                defaultMessage="Source"
              />
            </h5>
          </EuiTitle>
          <div>
            <EuiSpacer size="s" />-
          </div>
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
      </EuiFlexGroup>
    </div>
  );
}
