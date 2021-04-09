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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ValuesType } from 'utility-types';
import { asDuration } from '../../../common/utils/formatters';
import { TimestampTooltip } from '../../components/shared/timestamp_tooltip';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { ObservabilityAPIReturnType } from '../../services/call_observability_api/types';
import { AlertsFlyout } from './alerts_flyout';

export type TopAlert = ValuesType<
  ObservabilityAPIReturnType<'GET /api/observability/rules/alerts/top'>
>;

type AlertsTableProps = Omit<
  EuiBasicTableProps<TopAlert>,
  'columns' | 'isSelectable' | 'pagination' | 'selection'
>;

export function AlertsTable(props: AlertsTableProps) {
  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { prepend } = usePluginContext().core.http.basePath;

  // This is a contrived implementation of the reason field that shows how
  // you could link to certain types of resources based on what's contained
  // in their alert data.
  function reasonRenderer(text: string, item: TopAlert) {
    if (item.ruleId === 'apm.transaction_duration') {
      return (
        <EuiLink href={prepend(`/app/apm/services/${item.fields['service.name']}`)}>
          {i18n.translate('xpack.observability.alerts.table.reason.errorRate', {
            defaultMessage: `Latency for {serviceName} is above the threshold`,
            values: {
              serviceName: item.fields['service.name'],
            },
          })}
        </EuiLink>
      );
    }

    if (item.ruleId === 'apm.error_rate') {
      return (
        <EuiLink href={prepend(`/app/apm/services/${item.fields['service.name']}`)}>
          {i18n.translate('xpack.observability.alerts.table.reason.errorRate', {
            defaultMessage: `Error rate for {serviceName} is above the threshold`,
            values: {
              serviceName: item.fields['service.name'],
            },
          })}
        </EuiLink>
      );
    }
    return <>{item.ruleName}</>;
  }

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
      field: 'start',
      name: 'Triggered',
      render: (_, item) => {
        return <TimestampTooltip time={new Date(item.start).getTime()} timeUnit="milliseconds" />;
      },
    },
    {
      field: 'duration',
      name: 'Duration',
      render: (_, { duration }) => {
        return asDuration(duration, { extended: true });
      },
    },
    {
      field: 'severityLevel',
      name: 'Severity',
    },
    {
      field: 'reason',
      name: 'Reason',
      dataType: 'string',
      render: reasonRenderer,
    },
    {
      actions,
      name: 'Actions',
    },
  ];

  return (
    <>
      {flyoutAlert && <AlertsFlyout {...flyoutAlert} onClose={handleFlyoutClose} />}
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
