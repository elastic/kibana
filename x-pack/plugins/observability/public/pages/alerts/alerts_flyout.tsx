/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutProps,
  EuiInMemoryTable,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { asDuration } from '../../../common/utils/formatters';
import { TopAlert } from './alerts_table';

type AlertsFlyoutProps = TopAlert & EuiFlyoutProps;

export function AlertsFlyout(props: AlertsFlyoutProps) {
  const { onClose, active, duration, ruleCategory, ruleName } = props;
  const timestamp = props['@timestamp'];

  const overviewListItems = [
    {
      title: 'Status',
      description: active ? 'Active' : 'Recovered',
    },
    // {
    //   title: 'Severity',
    //   description: severity || '-', // TODO: badge and "(changed 2 min ago)"
    // },
    // {
    //   title: 'Affected entity',
    //   description: affectedEntity || '-', // TODO: link to entity
    // },
    {
      title: 'Triggered',
      description: timestamp, // TODO: format date
    },
    {
      title: 'Duration',
      description: asDuration(duration, { extended: true }) || '-', // TODO: format duration
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
      title: 'Type',
      description: ruleCategory || '-',
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
          <EuiInMemoryTable
            columns={[
              { field: 'title', name: '' },
              { field: 'description', name: '' },
            ]}
            items={overviewListItems}
          />
          {/* <EuiSpacer />
          <EuiTitle size="xs">
            <h4>Severity log</h4>
          </EuiTitle>
          <EuiInMemoryTable
            columns={[
              { field: '@timestamp', name: 'Timestamp', dataType: 'date' },
              {
                field: 'severity',
                name: 'Severity',
                render: (_, item) => (
                  <>
                    <EuiBadge>{item.severity}</EuiBadge> {item.message}
                  </>
                ),
              },
            ]}
            items={severityLog ?? []}
          /> */}
        </>
      ),
    },
    {
      id: 'metadata',
      name: i18n.translate('xpack.observability.alerts.flyoutMetadataTabTitle', {
        defaultMessage: 'Metadata',
      }),
      disabled: true,
      content: <></>,
    },
  ];

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader>
        <EuiTitle size="xs">
          <h2>{ruleName}</h2>
        </EuiTitle>
        <EuiTabbedContent size="s" tabs={tabs} />
      </EuiFlyoutHeader>
    </EuiFlyout>
  );
}
