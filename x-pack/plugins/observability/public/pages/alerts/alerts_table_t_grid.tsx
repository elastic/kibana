/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import {
  ALERT_DURATION,
  ALERT_SEVERITY_LEVEL,
  ALERT_STATUS,
  ALERT_START,
  RULE_NAME,
} from '@kbn/rule-data-utils/target/technical_field_names';

import type { TimelinesUIStart } from '../../../../timelines/public';
import type { TopAlert } from './';
import { AlertsFlyout } from './alerts_flyout';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import type { ColumnHeaderOptions, RowRenderer } from '../../../../timelines/common';
import { RenderCellValue } from './render_cell_value';
import { RowCellActionsRender } from './alerts_table_t_grid_actions';

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
    initialWidth: 74,
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

export function AlertsTableTGrid(props: AlertsTableTGridProps) {
  const { rangeFrom, rangeTo, kuery } = props;
  const [flyoutAlert, setFlyoutAlert] = useState<TopAlert | undefined>(undefined);
  const handleFlyoutClose = () => setFlyoutAlert(undefined);
  const { timelines } = useKibana<{ timelines: TimelinesUIStart }>().services;

  const trailingControlColumns = [
    {
      id: 'actions',
      width: 40,
      headerCellRender: () => null,
      rowCellRender: RowCellActionsRender,
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
        query: { query: kuery, language: 'kuery' },
        renderCellValue: RenderCellValue,
        rowRenderers: NO_ROW_RENDER,
        start: rangeFrom,
        sort: [
          {
            columnId: '@timestamp',
            columnType: 'date',
            sortDirection: 'desc',
          },
        ],
        utilityBar: () => <></>,
        leadingControlColumns: [],
        trailingControlColumns,
      })}
    </>
  );
}
