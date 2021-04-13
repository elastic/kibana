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
import { TopAlert } from '../alerts_table';

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
      description: alert.severityLevel || '-', // TODO: badge and "(changed 2 min ago)"
    },
    // {
    //   title: 'Affected entity',
    //   description: affectedEntity || '-', // TODO: link to entity
    // },
    {
      title: 'Triggered',
      description: (
        <span title={alert.start.toString()}>{moment(alert.start).format(dateFormat)}</span>
      ),
    },
    {
      title: 'Duration',
      description: (
        <span title={alert.duration.toString()}>
          {asDuration(alert.duration, { extended: true }) || '-'}
        </span>
      ),
    },
    // {
    //   title: 'Expected value',
    //   description: expectedValue || '-',
    // },
    // {
    //   title: 'Actual value',
    //   description: actualValue || '-',
    // },
    {
      title: 'Rule type',
      description: alert.ruleCategory || '-',
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
          <h2>{alert.ruleName}</h2>
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
