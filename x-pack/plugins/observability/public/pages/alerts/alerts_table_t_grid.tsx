/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-data-utils/target/alerts_as_data_rbac';
import { EuiButtonIcon, EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

import React, { Suspense, useState } from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_STATUS,
  ALERT_START,
  RULE_NAME,
} from '@kbn/rule-data-utils/target/technical_field_names';

import type { TimelinesUIStart } from '../../../../timelines/public';
import type { TopAlert } from './';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import type {
  ActionProps,
  AlertStatus,
  ColumnHeaderOptions,
  RowRenderer,
} from '../../../../timelines/common';

import { getRenderCellValue } from './render_cell_value';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { decorateResponse } from './decorate_response';
import { getDefaultCellActions } from './default_cell_actions';
import { LazyAlertsFlyout } from '../..';

interface AlertsTableTGridProps {
  indexName: string;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: string;
  setRefetch: (ref: () => void) => void;
}

const EventsThContent = styled.div.attrs(({ className = '' }) => ({
  className: `siemEventsTable__thContent ${className}`,
}))<{ textAlign?: string; width?: number }>`
  font-size: ${({ theme }) => theme.eui.euiFontSizeXS};
  font-weight: ${({ theme }) => theme.eui.euiFontWeightBold};
  line-height: ${({ theme }) => theme.eui.euiLineHeight};
  min-width: 0;
  padding: ${({ theme }) => theme.eui.paddingSizes.xs};
  text-align: ${({ textAlign }) => textAlign};
  width: ${({ width }) =>
    width != null
      ? `${width}px`
      : '100%'}; /* Using width: 100% instead of flex: 1 and max-width: 100% for IE11 */

  > button.euiButtonIcon,
  > .euiToolTipAnchor > button.euiButtonIcon {
    margin-left: ${({ theme }) => `-${theme.eui.paddingSizes.xs}`};
  }
`;
/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
export const columns: Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.statusColumnDescription', {
      defaultMessage: 'Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 79,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.triggeredColumnDescription', {
      defaultMessage: 'Triggered',
    }),
    id: ALERT_START,
    initialWidth: 176,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.durationColumnDescription', {
      defaultMessage: 'Duration',
    }),
    id: ALERT_DURATION,
    initialWidth: 116,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.severityColumnDescription', {
      defaultMessage: 'Severity',
    }),
    id: ALERT_SEVERITY_LEVEL,
    initialWidth: 102,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    linkField: '*',
    id: RULE_NAME,
  },
];

const NO_ROW_RENDER: RowRenderer[] = [];

const trailingControlColumns: never[] = [];

const OBSERVABILITY_ALERT_CONSUMERS = [
  AlertConsumers.APM,
  AlertConsumers.LOGS,
  AlertConsumers.INFRASTRUCTURE,
  AlertConsumers.SYNTHETICS,
];

export function AlertsTableTGrid(props: AlertsTableTGridProps) {
  const { core, observabilityRuleTypeRegistry } = usePluginContext();
  const { prepend } = core.http.basePath;
  const { indexName, rangeFrom, rangeTo, kuery, status, setRefetch } = props;
  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { timelines } = useKibana<{ timelines: TimelinesUIStart }>().services;

  const leadingControlColumns = [
    {
      id: 'expand',
      width: 40,
      headerCellRender: () => {
        return (
          <EventsThContent>
            {i18n.translate('xpack.observability.alertsTable.actionsTextLabel', {
              defaultMessage: 'Actions',
            })}
          </EventsThContent>
        );
      },
      rowCellRender: ({ data }: ActionProps) => {
        const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
        const decoratedAlerts = decorateResponse(
          [dataFieldEs] ?? [],
          observabilityRuleTypeRegistry
        );
        const alert = decoratedAlerts[0];
        return (
          <EuiButtonIcon
            size="s"
            iconType="expand"
            color="text"
            onClick={() => setFlyoutAlert(alert)}
          />
        );
      },
    },
    {
      id: 'view_in_app',
      width: 40,
      headerCellRender: () => null,
      rowCellRender: ({ data }: ActionProps) => {
        const dataFieldEs = data.reduce((acc, d) => ({ ...acc, [d.field]: d.value }), {});
        const decoratedAlerts = decorateResponse(
          [dataFieldEs] ?? [],
          observabilityRuleTypeRegistry
        );
        const alert = decoratedAlerts[0];
        return (
          <EuiButtonIcon
            size="s"
            target="_blank"
            rel="nofollow noreferrer"
            href={prepend(alert.link ?? '')}
            iconType="inspect"
            color="text"
          />
        );
      },
    },
  ];

  return (
    <>
      {flyoutAlert && (
        <Suspense fallback={null}>
          <LazyAlertsFlyout
            alert={flyoutAlert}
            observabilityRuleTypeRegistry={observabilityRuleTypeRegistry}
            onClose={handleFlyoutClose}
          />
        </Suspense>
      )}
      {timelines.getTGrid<'standalone'>({
        alertConsumers: OBSERVABILITY_ALERT_CONSUMERS,
        type: 'standalone',
        columns,
        deletedEventIds: [],
        defaultCellActions: getDefaultCellActions({ enableFilterActions: false }),
        end: rangeTo,
        filters: [],
        indexNames: [indexName],
        itemsPerPage: 10,
        itemsPerPageOptions: [10, 25, 50],
        loadingText: i18n.translate('xpack.observability.alertsTable.loadingTextLabel', {
          defaultMessage: 'loading alerts',
        }),
        footerText: i18n.translate('xpack.observability.alertsTable.footerTextLabel', {
          defaultMessage: 'alerts',
        }),
        query: {
          query: `${ALERT_STATUS}: ${status}${kuery !== '' ? ` and ${kuery}` : ''}`,
          language: 'kuery',
        },
        renderCellValue: getRenderCellValue({ rangeFrom, rangeTo, setFlyoutAlert }),
        rowRenderers: NO_ROW_RENDER,
        start: rangeFrom,
        setRefetch,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            sortDirection: 'desc',
          },
        ],
        filterStatus: status as AlertStatus,
        leadingControlColumns,
        trailingControlColumns,
        unit: (totalAlerts: number) =>
          i18n.translate('xpack.observability.alertsTable.showingAlertsTitle', {
            values: { totalAlerts },
            defaultMessage: '{totalAlerts, plural, =1 {alert} other {alerts}}',
          }),
      })}
    </>
  );
}
