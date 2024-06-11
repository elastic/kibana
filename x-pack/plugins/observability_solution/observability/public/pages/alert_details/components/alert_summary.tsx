/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import { TAGS, ALERT_START, ALERT_END } from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { TopAlert } from '../../..';
import { Groups } from './groups';
import { Tags } from './tags';
import { getSources } from '../../../components/alert_overview/helpers/get_sources';

export interface AlertSummaryField {
  label: ReactNode | string;
  value: ReactNode | string | number;
}
interface AlertSummaryProps {
  alert: TopAlert;
  ruleLink: string;
  ruleName?: string;
  alertSummaryFields?: AlertSummaryField[];
}

export function AlertSummary({ alert, ruleName, ruleLink, alertSummaryFields }: AlertSummaryProps) {
  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  const commonAlertSummaryFields = [];

  const groups = getSources(alert) as Array<{ field: string; value: string }>;
  const tags = alert.fields[TAGS];

  if (groups && groups.length > 0) {
    commonAlertSummaryFields.push({
      label: i18n.translate(
        'xpack.observability.customThreshold.rule.alertDetailsAppSection.summaryField.source',
        {
          defaultMessage: 'Source',
        }
      ),
      value: (
        <Groups groups={groups} timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }} />
      ),
    });
  }

  if (tags && tags.length > 0) {
    commonAlertSummaryFields.push({
      label: i18n.translate(
        'xpack.observability.metrics.alertDetailsAppSection.summaryField.tags',
        {
          defaultMessage: 'Tags',
        }
      ),
      value: <Tags tags={tags} />,
    });
  }

  commonAlertSummaryFields.push({
    label: i18n.translate('xpack.observability.metrics.alertDetailsAppSection.summaryField.rule', {
      defaultMessage: 'Rule',
    }),
    value: (
      <EuiLink data-test-subj="metricsRuleAlertDetailsAppSectionRuleLink" href={ruleLink}>
        {ruleName ?? '-'}
      </EuiLink>
    ),
  });

  const alertSummary = [...commonAlertSummaryFields, ...(alertSummaryFields ?? [])];

  return (
    <div data-test-subj="alert-summary-container">
      {alertSummary && alertSummary.length > 0 && (
        <>
          <EuiFlexGroup gutterSize="xl">
            {alertSummary.map((field, idx) => {
              return (
                <EuiFlexItem key={idx} grow={false}>
                  <EuiText color="subdued">{field.label}</EuiText>
                  <EuiText>{field.value}</EuiText>
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
          <EuiSpacer size="l" />
        </>
      )}
    </div>
  );
}
