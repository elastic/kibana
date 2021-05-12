/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutProps,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import React from 'react';
import { TopAlert } from '../';
import { useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';
import { asDuration } from '../../../../common/utils/formatters';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { SeverityBadge } from '../severity_badge';

type AlertsFlyoutProps = { alert: TopAlert } & EuiFlyoutProps;

export function AlertsFlyout({ onClose, alert }: AlertsFlyoutProps) {
  const dateFormat = useUiSetting<string>('dateFormat');
  const { core } = usePluginContext();
  const { prepend } = core.http.basePath;

  const overviewListItems = [
    {
      title: i18n.translate('xpack.observability.alertsFlyout.statusLabel', {
        defaultMessage: 'Status',
      }),
      description: alert.active ? 'Active' : 'Recovered',
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.severityLabel', {
        defaultMessage: 'Severity',
      }),
      description: <SeverityBadge severityLevel={alert['kibana.rac.alert.severity.level']} />,
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.triggeredLabel', {
        defaultMessage: 'Triggered',
      }),
      description: (
        <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
      ),
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.durationLabel', {
        defaultMessage: 'Duration',
      }),
      description: asDuration(alert['kibana.rac.alert.duration.us'], { extended: true }),
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.expectedValueLabel', {
        defaultMessage: 'Expected value',
      }),
      description: alert['kibana.observability.evaluation.threshold'] ?? '-',
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.actualValueLabel', {
        defaultMessage: 'Actual value',
      }),
      description: alert['kibana.observability.evaluation.value'] ?? '-',
    },
    {
      title: i18n.translate('xpack.observability.alertsFlyout.ruleTypeLabel', {
        defaultMessage: 'Rule type',
      }),
      description: alert['rule.category'] ?? '-',
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>{alert['rule.name']}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{alert.reason}</EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiSpacer size="s" />
        <EuiDescriptionList
          compressed={true}
          type="responsiveColumn"
          listItems={overviewListItems}
        />
      </EuiFlyoutBody>
      {alert.link && (
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton href={prepend(alert.link)} fill>
                View in app
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      )}
    </EuiFlyout>
  );
}
