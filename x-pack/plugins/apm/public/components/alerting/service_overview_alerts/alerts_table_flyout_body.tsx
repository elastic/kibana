/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type {
  AlertsTableConfigurationRegistryContract,
  GetRenderCellValue,
  AlertTableFlyoutComponent,
  AlertsTableFlyoutBaseProps,
} from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiLink,
  EuiHorizontalRule,
  EuiDescriptionList,
} from '@elastic/eui';
import {
  AlertConsumers,
  TIMESTAMP,
  EVENT_ACTION,
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_STATUS,
  ALERT_RULE_TYPE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_ACTIVE,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_UUID,
} from '@kbn/rule-data-utils';
import moment from 'moment-timezone';
import { useKibana } from '@kbn/kibana-react-plugin/public';

export const AlertTableFlyoutBody = (data: AlertsTableFlyoutBaseProps) => {
  const { alert } = data;

  const overviewListItems = [
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.status', {
        defaultMessage: 'Status',
      }),
      description: alert[ALERT_STATUS]
        ? ALERT_STATUS_ACTIVE
        : ALERT_STATUS_RECOVERED,
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.status', {
        defaultMessage: 'Last Updated',
      }),
      description: (
        <span>{moment(alert[TIMESTAMP]).format('YYYY-MM-DD HH:mm:ss')}</span>
      ),
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.duration', {
        defaultMessage: 'Duration',
      }),
      description: alert[ALERT_DURATION] ?? '-',
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.expectedValue', {
        defaultMessage: 'Expected value',
      }),
      description: alert[ALERT_EVALUATION_THRESHOLD] ?? '-',
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.actualValue', {
        defaultMessage: 'Actual value',
      }),
      description: alert[ALERT_EVALUATION_VALUE] ?? '-',
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.ruleType', {
        defaultMessage: 'Rule type',
      }),
      description: alert[ALERT_RULE_CATEGORY] ?? '-',
    },
  ];

  return (
    <>
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.apm.alerts.flyoutBody.reason', {
            defaultMessage: 'Reason',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s">{alert[ALERT_REASON]}</EuiText>
      <EuiSpacer size="s" />

      <EuiHorizontalRule size="full" />
      <EuiTitle size="xs">
        <h4>
          {i18n.translate('xpack.apm.alerts.flyoutBody.documentSummary', {
            defaultMessage: 'Document Summary',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        compressed={true}
        type="responsiveColumn"
        listItems={overviewListItems}
      />
    </>
  );
};
