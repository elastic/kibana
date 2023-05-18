/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { get } from 'lodash';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiHorizontalRule,
  EuiDescriptionList,
  EuiFlyoutBody,
} from '@elastic/eui';
import {
  ALERT_DURATION,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_FLAPPING,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
} from '@kbn/rule-data-utils';
import { AlertLifecycleStatusBadge } from '@kbn/alerts-ui-shared';
import moment from 'moment-timezone';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../../utils/kibana_react';
import { asDuration, toMicroseconds } from '../../../common/utils/formatters';
import { paths } from '../../config/paths';
import { translations } from '../../config/translations';
import { formatAlertEvaluationValue } from '../../utils/format_alert_evaluation_value';
import { RULE_DETAILS_PAGE_ID } from '../../pages/rule_details/constants';
import type { TopAlert } from '../../typings/alerts';

interface FlyoutProps {
  alert: TopAlert;
  id?: string;
}

// For APM Latency threshold rule, threshold is in ms but the duration formatter works with microseconds
const normalizeUnit = (ruleTypeId: string, value?: number) => {
  if (ruleTypeId === 'apm.transaction_duration' && value) {
    return toMicroseconds(value, 'milliseconds');
  }
  return value;
};

export function AlertsFlyoutBody({ alert, id: pageId }: FlyoutProps) {
  const {
    http: {
      basePath: { prepend },
    },
  } = useKibana().services;

  const dateFormat = useUiSetting<string>('dateFormat');

  const ruleId = get(alert.fields, ALERT_RULE_UUID) ?? null;
  const linkToRule =
    pageId !== RULE_DETAILS_PAGE_ID && ruleId && prepend
      ? prepend(paths.observability.ruleDetails(ruleId))
      : null;

  const overviewListItems = [
    {
      title: translations.alertsFlyout.statusLabel,
      description: (
        <AlertLifecycleStatusBadge
          alertStatus={alert.active ? ALERT_STATUS_ACTIVE : ALERT_STATUS_RECOVERED}
          flapping={alert.fields[ALERT_FLAPPING]}
        />
      ),
    },
    {
      title: translations.alertsFlyout.startedAtLabel,
      description: (
        <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
      ),
    },
    {
      title: translations.alertsFlyout.lastUpdatedLabel,
      description: (
        <span title={alert.lastUpdated.toString()}>
          {moment(alert.lastUpdated).format(dateFormat)}
        </span>
      ),
    },
    {
      title: translations.alertsFlyout.durationLabel,
      description: asDuration(alert.fields[ALERT_DURATION], { extended: true }),
    },
    {
      title: translations.alertsFlyout.expectedValueLabel,
      description: formatAlertEvaluationValue(
        alert.fields[ALERT_RULE_TYPE_ID],
        normalizeUnit(alert.fields[ALERT_RULE_TYPE_ID], alert.fields[ALERT_EVALUATION_THRESHOLD])
      ),
    },
    {
      title: translations.alertsFlyout.actualValueLabel,
      description: formatAlertEvaluationValue(
        alert.fields[ALERT_RULE_TYPE_ID],
        alert.fields[ALERT_EVALUATION_VALUE]
      ),
    },
    {
      title: translations.alertsFlyout.ruleTypeLabel,
      description: alert.fields[ALERT_RULE_CATEGORY] ?? '-',
    },
  ];

  return (
    <EuiFlyoutBody>
      <EuiTitle size="xs">
        <h4>{translations.alertsFlyout.reasonTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">{alert.reason}</EuiText>
      <EuiSpacer size="s" />
      {!!linkToRule && (
        <EuiLink href={linkToRule} data-test-subj="viewRuleDetailsFlyout">
          {translations.alertsFlyout.viewRulesDetailsLinkText}
        </EuiLink>
      )}
      <EuiHorizontalRule size="full" />
      <EuiTitle size="xs">
        <h4>{translations.alertsFlyout.documentSummaryTitle}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        compressed={true}
        type="responsiveColumn"
        listItems={overviewListItems}
        titleProps={{
          'data-test-subj': 'alertsFlyoutDescriptionListTitle',
        }}
        descriptionProps={{
          'data-test-subj': 'alertsFlyoutDescriptionListDescription',
        }}
      />
    </EuiFlyoutBody>
  );
}
