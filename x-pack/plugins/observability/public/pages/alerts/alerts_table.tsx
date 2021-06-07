/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomItemAction,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiBasicTableProps,
  EuiButton,
  EuiIconTip,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
} from '@kbn/rule-data-utils/target/technical_field_names';
import { asDuration } from '../../../common/utils/formatters';
import { TimestampTooltip } from '../../components/shared/timestamp_tooltip';
import { usePluginContext } from '../../hooks/use_plugin_context';
import type { TopAlert } from './';
import { AlertsFlyout } from './alerts_flyout';
import { SeverityBadge } from './severity_badge';

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
      render: (alert) =>
        alert.link ? (
          <EuiButton href={prepend(alert.link)} size="s">
            {i18n.translate('xpack.observability.alertsTable.viewInAppButtonLabel', {
              defaultMessage: 'View in app',
            })}
          </EuiButton>
        ) : (
          <></>
        ),
      isPrimary: true,
    },
  ];

  const columns: Array<EuiBasicTableColumn<TopAlert>> = [
    {
      field: 'active',
      name: i18n.translate('xpack.observability.alertsTable.statusColumnDescription', {
        defaultMessage: 'Status',
      }),
      align: 'center',
      render: (_, alert) => {
        const { active } = alert;

        return active ? (
          <EuiIconTip
            content={i18n.translate('xpack.observability.alertsTable.statusOpenDescription', {
              defaultMessage: 'Open',
            })}
            color="danger"
            type="alert"
          />
        ) : (
          <EuiIconTip
            content={i18n.translate('xpack.observability.alertsTable.statusClosedDescription', {
              defaultMessage: 'Closed',
            })}
            type="check"
          />
        );
      },
    },
    {
      field: 'start',
      name: i18n.translate('xpack.observability.alertsTable.triggeredColumnDescription', {
        defaultMessage: 'Triggered',
      }),
      render: (_, item) => {
        return <TimestampTooltip time={new Date(item.start).getTime()} timeUnit="milliseconds" />;
      },
    },
    {
      field: 'duration',
      name: i18n.translate('xpack.observability.alertsTable.durationColumnDescription', {
        defaultMessage: 'Duration',
      }),
      render: (_, alert) => {
        const { active } = alert;
        return active ? null : asDuration(alert.fields[ALERT_DURATION], { extended: true });
      },
    },
    {
      field: 'severity',
      name: i18n.translate('xpack.observability.alertsTable.severityColumnDescription', {
        defaultMessage: 'Severity',
      }),
      render: (_, alert) => {
        return <SeverityBadge severityLevel={alert.fields[ALERT_SEVERITY_LEVEL]} />;
      },
    },
    {
      field: 'reason',
      name: i18n.translate('xpack.observability.alertsTable.reasonColumnDescription', {
        defaultMessage: 'Reason',
      }),
      dataType: 'string',
      render: (_, item) => {
        return <EuiLink onClick={() => setFlyoutAlert(item)}>{item.reason}</EuiLink>;
      },
    },
    {
      actions,
      name: i18n.translate('xpack.observability.alertsTable.actionsColumnDescription', {
        defaultMessage: 'Actions',
      }),
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
