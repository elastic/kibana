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
  EuiButton,
  EuiIconTip,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_UUID,
} from '@kbn/rule-data-utils/target/technical_field_names';
import React, { Suspense, useMemo, useState } from 'react';
import { LazyAlertsFlyout } from '../..';
import { asDuration } from '../../../common/utils/formatters';
import { TimestampTooltip } from '../../components/shared/timestamp_tooltip';
import { usePluginContext } from '../../hooks/use_plugin_context';
import type { TopAlert, TopAlertResponse } from './';
import { decorateResponse } from './decorate_response';
import { SeverityBadge } from './severity_badge';

const pagination = { pageIndex: 0, pageSize: 0, totalItemCount: 0 };

interface AlertsTableProps {
  items: TopAlertResponse[];
}

export function AlertsTable(props: AlertsTableProps) {
  const [selectedAlertId, setSelectedAlertId] = useState<string | undefined>(undefined);
  const handleFlyoutClose = () => setSelectedAlertId(undefined);
  const { core, observabilityRuleTypeRegistry } = usePluginContext();
  const { prepend } = core.http.basePath;
  const items = useMemo(() => decorateResponse(props.items, observabilityRuleTypeRegistry), [
    props.items,
    observabilityRuleTypeRegistry,
  ]);

  const actions: Array<CustomItemAction<TopAlert>> = useMemo(
    () => [
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
    ],
    [prepend]
  );

  const columns: Array<EuiBasicTableColumn<TopAlert>> = useMemo(
    () => [
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
        render: (_, alert) => {
          return (
            <TimestampTooltip time={new Date(alert.start).getTime()} timeUnit="milliseconds" />
          );
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
        render: (_, alert) => {
          return (
            <EuiLink onClick={() => setSelectedAlertId(alert.fields[ALERT_UUID])}>
              {alert.reason}
            </EuiLink>
          );
        },
      },
      {
        actions,
        name: i18n.translate('xpack.observability.alertsTable.actionsColumnDescription', {
          defaultMessage: 'Actions',
        }),
      },
    ],
    [actions, setSelectedAlertId]
  );

  return (
    <>
      <Suspense fallback={null}>
        <LazyAlertsFlyout
          alerts={props.items}
          observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
          onClose={handleFlyoutClose}
          selectedAlertId={selectedAlertId}
        />
      </Suspense>
      <EuiBasicTable<TopAlert>
        columns={columns}
        items={items}
        tableLayout="auto"
        pagination={pagination}
      />
    </>
  );
}
