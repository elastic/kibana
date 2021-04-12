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
  DefaultItemAction,
  EuiTableSelectionType,
  EuiLink,
  EuiFlexGroup,
  EuiIcon,
  EuiBadge,
} from '@elastic/eui';
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

  const actions: Array<DefaultItemAction<TopAlert>> = [
    {
      name: 'Alert details',
      description: 'Alert details',
      onClick: (item) => {
        setFlyoutAlert(item);
      },
      isPrimary: true,
    },
  ];

  const columns: Array<EuiBasicTableColumn<TopAlert>> = [
    {
      field: 'active',
      name: 'Status',
      width: '112px',
      render: (_, { active }) => {
        const style = {
          width: '96px',
          textAlign: 'center' as const,
        };

        return active ? (
          <EuiBadge iconType="alert" color="danger" style={style}>
            {i18n.translate('xpack.observability.alertsTable.status.active', {
              defaultMessage: 'Active',
            })}
          </EuiBadge>
        ) : (
          <EuiBadge iconType="check" color="hollow" style={style}>
            {i18n.translate('xpack.observability.alertsTable.status.recovered', {
              defaultMessage: 'Recovered',
            })}
          </EuiBadge>
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
      field: 'reason',
      name: 'Reason',
      dataType: 'string',
      render: (_, item) => {
        return item.link ? <EuiLink href={prepend(item.link)}>{item.reason}</EuiLink> : item.reason;
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
        isSelectable={true}
        selection={{} as EuiTableSelectionType<TopAlert>}
        columns={columns}
        tableLayout="auto"
        pagination={{ pageIndex: 0, pageSize: 0, totalItemCount: 0 }}
      />
    </>
  );
}
