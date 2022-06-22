/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AlertsTableFlyoutBaseProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiDescriptionList,
} from '@elastic/eui';
import {
  TIMESTAMP,
  ALERT_DURATION,
  ALERT_REASON,
  ALERT_STATUS,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_ACTIVE,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_RULE_CATEGORY,
} from '@kbn/rule-data-utils';
import {
  asDuration,
  asAbsoluteDateTime,
} from '../../../../common/utils/formatters';
import { getValue } from './get_render_cell_value';
export const AlertTableFlyoutBody = (data: AlertsTableFlyoutBaseProps) => {
  const { alert } = data;

  const overviewListItems = [
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.status', {
        defaultMessage: 'Status',
      }),
      description: getValue(alert[ALERT_STATUS])
        ? ALERT_STATUS_ACTIVE
        : ALERT_STATUS_RECOVERED,
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.status', {
        defaultMessage: 'Last Updated',
      }),
      description: asAbsoluteDateTime(getValue(alert[TIMESTAMP])),
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.duration', {
        defaultMessage: 'Duration',
      }),
      description: asDuration(getValue(alert[ALERT_DURATION])) ?? '-',
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.expectedValue', {
        defaultMessage: 'Expected value',
      }),
      description: getValue(alert[ALERT_EVALUATION_THRESHOLD]) ?? '-',
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.actualValue', {
        defaultMessage: 'Actual value',
      }),
      description: getValue(alert[ALERT_EVALUATION_VALUE]) ?? '-',
    },
    {
      title: i18n.translate('xpack.apm.alerts.flyoutBody.ruleType', {
        defaultMessage: 'Rule type',
      }),
      description: getValue(alert[ALERT_RULE_CATEGORY]) ?? '-',
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
