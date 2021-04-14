/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBasicTableProps,
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { CustomItemAction } from '@elastic/eui/src/components/basic_table/custom_item_action';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { asDuration } from '../../../common/utils/formatters';
import { TimestampTooltip } from '../../components/shared/timestamp_tooltip';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { AlertsFlyout } from './alerts_flyout';

export interface TopAlert {
  start: number;
  duration: number;
  reason: string;
  link?: string;
  severityLevel?: string;
  active: boolean;
  ruleName: string;
  ruleCategory: string;
}

type AlertsTableProps = Omit<
  EuiBasicTableProps<TopAlert>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

export function AlertsTable(props: AlertsTableProps) {
  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { core } = usePluginContext();
  const { prepend } = core.http.basePath;

  const actions: Array<CustomItemAction<TopAlert>> = [
    {
      render: (item) => (
        <EuiButton href={prepend(item.link)} size="s">
          View in app
        </EuiButton>
      ),
      isPrimary: true,
    },
  ];

  const columns: Array<EuiBasicTableColumn<TopAlert>> = [
    {
      field: 'active',
      name: 'Status',
      align: 'center',
      render: (_, { active }) => {
        return active ? (
          <EuiToolTip
            content={i18n.translate('xpack.observability.alertsTable.status.active', {
              defaultMessage: 'Active',
            })}
          >
            <EuiIcon type="alert" color="danger" />
          </EuiToolTip>
        ) : (
          <EuiToolTip
            content={i18n.translate('xpack.observability.alertsTable.status.recovered', {
              defaultMessage: 'Recovered',
            })}
          >
            <EuiIcon type="check" />
          </EuiToolTip>
        );
      },
    },
    {
      field: 'start',
      name: 'Triggered',
      render: (_, item) => {
        return <TimestampTooltip time={new Date(item.start).getTime()} timeUnit="milliseconds" />;
      },
    },
    {
      field: 'duration',
      name: 'Duration',
      render: (_, { duration, active }) => {
        return active ? null : asDuration(duration, { extended: true });
      },
    },
    {
      field: 'severity',
      name: 'Severity',
      render: (_, { severityLevel }) => {
        return severityLevel;
      },
    },
    {
      field: 'reason',
      name: 'Reason',
      dataType: 'string',
      render: (_, item) => {
        return <EuiLink onClick={() => setFlyoutAlert(item)}>{item.reason}</EuiLink>;
      },
    },
    {
      actions,
      name: 'Actions',
    },
  ];

  return (
    <>
      {flyoutAlert && <AlertsFlyout alert={flyoutAlert} onClose={handleFlyoutClose} />}
      <EuiBasicTable<TopAlert>
        {...props}
        columns={columns}
        tableLayout="auto"
        pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
      />
    </>
  );
}
