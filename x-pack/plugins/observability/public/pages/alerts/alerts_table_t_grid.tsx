/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonIcon, EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_STATUS,
  ALERT_START,
  RULE_ID,
  RULE_NAME,
} from '@kbn/rule-data-utils/target/technical_field_names';
import { format, parse } from 'url';

import type { TimelinesUIStart } from '../../../../timelines/public';
import type { TopAlert } from './';
import { AlertsFlyout } from './alerts_flyout';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import type { ActionProps, ColumnHeaderOptions, RowRenderer } from '../../../../timelines/common';
import { getRenderCellValue } from './render_cell_value';
import { parseTechnicalFields } from '../../../../rule_registry/common/parse_technical_fields';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { asDuration, asPercent } from '../../../common/utils/formatters';

interface AlertsTableTGridProps {
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
  status: string;
}

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
    initialWidth: 116,
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
    initialWidth: 400,
  },
];

const NO_ROW_RENDER: RowRenderer[] = [];

const trailingControlColumns = [];
//  [ {
//     id: 'actions',
//     width: 40,
//     headerCellRender: () => null,
//     rowCellRender: RowCellActionsRender,
//   },
// ];

export function AlertsTableTGrid(props: AlertsTableTGridProps) {
  const { core, observabilityRuleTypeRegistry } = usePluginContext();
  const { prepend } = core.http.basePath;
  const { rangeFrom, rangeTo, kuery, status } = props;
  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { timelines } = useKibana<{ timelines: TimelinesUIStart }>().services;

  const leadingControlColumns = [
    {
      id: 'expand',
      width: 40,
      headerCellRender: () => null,
      rowCellRender: ({ data }: ActionProps) => {
        const dataFieldEs = data.reduce<TopAlert>(
          (acc, d) => ({ ...acc, [d.field]: d.value }),
          {} as TopAlert
        );
        const parsedFields = parseTechnicalFields(dataFieldEs);
        const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[RULE_ID]!);
        const formatted = {
          link: undefined,
          reason: parsedFields[RULE_NAME]!,
          ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
        };

        const parsedLink = formatted.link ? parse(formatted.link, true) : undefined;

        const alert = {
          ...formatted,
          fields: parsedFields,
          link: parsedLink
            ? format({
                ...parsedLink,
                query: {
                  ...parsedLink.query,
                  rangeFrom,
                  rangeTo,
                },
              })
            : undefined,
          active: parsedFields[ALERT_STATUS] !== 'closed',
          start: new Date(parsedFields[ALERT_START]!).getTime(),
        };
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
        const parsedFields = parseTechnicalFields(dataFieldEs);
        const formatter = observabilityRuleTypeRegistry.getFormatter(parsedFields[RULE_ID]!);
        const formatted = {
          link: undefined,
          reason: parsedFields[RULE_NAME]!,
          ...(formatter?.({ fields: parsedFields, formatters: { asDuration, asPercent } }) ?? {}),
        };

        const parsedLink = formatted.link ? parse(formatted.link, true) : undefined;
        const link = parsedLink
          ? format({
              ...parsedLink,
              query: {
                ...parsedLink.query,
                rangeFrom,
                rangeTo,
              },
            })
          : undefined;
        return (
          <EuiButtonIcon
            size="s"
            target="_blank"
            rel="nofollow noreferrer"
            href={prepend(link ?? '')}
            iconType="inspect"
            color="text"
          />
        );
      },
    },
  ];

  return (
    <>
      {flyoutAlert && <AlertsFlyout alert={flyoutAlert} onClose={handleFlyoutClose} />}
      {timelines.getTGrid<'standalone'>({
        type: 'standalone',
        columns,
        deletedEventIds: [],
        end: rangeTo,
        filters: [],
        indexNames: ['.kibana_smith_alerts-observability*'],
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
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            sortDirection: 'desc',
          },
        ],
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
