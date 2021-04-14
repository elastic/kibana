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
  EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import moment from 'moment-timezone';
import React from 'react';
import { useUiSetting } from '../../../../../../../src/plugins/kibana_react/public';
import { asDuration } from '../../../../common/utils/formatters';
import { usePluginContext } from '../../../hooks/use_plugin_context';
import { TopAlert } from '../';

type AlertsFlyoutProps = { alert: TopAlert } & EuiFlyoutProps;

export function AlertsFlyout({ onClose, alert }: AlertsFlyoutProps) {
  const dateFormat = useUiSetting<string>('dateFormat');
  const { core } = usePluginContext();
  const { prepend } = core.http.basePath;

  const overviewListItems = [
    {
      title: 'Status',
      description: alert.active ? 'Active' : 'Recovered',
    },
    {
      title: 'Severity',
      description: alert['kibana.rac.alert.severity.level'] ?? '-', // TODO: badge and "(changed 2 min ago)"
    },
    {
      title: 'Triggered',
      description: (
        <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
      ),
    },
    {
      title: 'Duration',
      description: asDuration(alert['kibana.rac.alert.duration.us'], { extended: true }),
    },
    {
      title: 'Expected value',
      description: alert['kibana.observability.evaluation.threshold'] ?? '-',
    },
    {
      title: 'Actual value',
      description: alert['kibana.observability.evaluation.value'] ?? '-',
    },
    {
      title: 'Rule type',
      description: alert['rule.category'] ?? '-',
    },
  ];

  const tabs = [
    {
      id: 'overview',
      name: i18n.translate('xpack.observability.alerts.flyoutOverviewTabTitle', {
        defaultMessage: 'Overview',
      }),
      content: (
        <>
          <EuiSpacer />
          <EuiDescriptionList type="responsiveColumn" listItems={overviewListItems} />
        </>
      ),
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="m">
      <EuiFlyoutHeader>
        <EuiTitle size="m">
          <h2>{alert['rule.name']}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">{alert.reason}</EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTabbedContent size="s" tabs={tabs} />
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
