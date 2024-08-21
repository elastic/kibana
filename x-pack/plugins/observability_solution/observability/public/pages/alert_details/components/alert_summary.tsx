/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { getPaddedAlertTimeRange } from '@kbn/observability-get-padded-alert-time-range-util';
import {
  TAGS,
  ALERT_START,
  ALERT_END,
  ALERT_RULE_NAME,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { TopAlert } from '../../..';
import { Groups } from '../../../components/alert_sources/groups';
import { Tags } from '../../../components/tags';
import { getSources } from '../../../components/alert_sources/get_sources';
import { useKibana } from '../../../utils/kibana_react';
import { paths } from '../../../../common/locators/paths';

export interface AlertSummaryField {
  label: ReactNode | string;
  value: ReactNode | string | number;
}
export interface AlertSummaryProps {
  alert: TopAlert;
  alertSummaryFields?: AlertSummaryField[];
}

export function AlertSummary({ alert, alertSummaryFields }: AlertSummaryProps) {
  const { http } = useKibana().services;

  const [timeRange, setTimeRange] = useState<TimeRange>({ from: 'now-15m', to: 'now' });

  const alertStart = alert.fields[ALERT_START];
  const alertEnd = alert.fields[ALERT_END];
  const ruleName = alert.fields[ALERT_RULE_NAME];
  const ruleId = alert.fields[ALERT_RULE_UUID];
  const tags = alert.fields[TAGS];

  const ruleLink = http.basePath.prepend(paths.observability.ruleDetails(ruleId));
  const commonFieldsAtStart = [];
  const commonFieldsAtEnd = [];
  const groups = getSources(alert) as Array<{ field: string; value: string }>;

  useEffect(() => {
    setTimeRange(getPaddedAlertTimeRange(alertStart!, alertEnd));
  }, [alertStart, alertEnd]);

  if (groups && groups.length > 0) {
    commonFieldsAtStart.push({
      label: i18n.translate('xpack.observability.alertDetails.alertSummaryField.source', {
        defaultMessage: 'Source',
      }),
      value: (
        <Groups groups={groups} timeRange={alertEnd ? timeRange : { ...timeRange, to: 'now' }} />
      ),
    });
  }

  if (tags && tags.length > 0) {
    commonFieldsAtEnd.push({
      label: i18n.translate('xpack.observability.alertDetails.alertSummaryField.tags', {
        defaultMessage: 'Tags',
      }),
      value: <Tags tags={tags} />,
    });
  }

  commonFieldsAtEnd.push({
    label: i18n.translate('xpack.observability.alertDetails.alertSummaryField.rule', {
      defaultMessage: 'Rule',
    }),
    value: (
      <EuiLink data-test-subj="o11yAlertRuleLink" href={ruleLink}>
        {ruleName}
      </EuiLink>
    ),
  });

  const alertSummary = [
    ...commonFieldsAtStart,
    ...(alertSummaryFields ?? []),
    ...commonFieldsAtEnd,
  ];

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

// eslint-disable-next-line import/no-default-export
export default AlertSummary;
