/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * We need to produce types and code transpilation at different folders during the build of the package.
 * We have types and code at different imports because we don't want to import the whole package in the resulting webpack bundle for the plugin.
 * This way plugins can do targeted imports to reduce the final code bundle
 */
import { ALERT_DURATION, ALERT_REASON, ALERT_STATUS, TIMESTAMP } from '@kbn/rule-data-utils';
import { EuiDataGridColumn } from '@elastic/eui';
import type { ColumnHeaderOptions } from '@kbn/timelines-plugin/common';
import { i18n } from '@kbn/i18n';

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
      defaultMessage: 'Alert Status',
    }),
    id: ALERT_STATUS,
    initialWidth: 110,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.lastUpdatedColumnDescription', {
      defaultMessage: 'Last updated',
    }),
    id: TIMESTAMP,
    initialWidth: 230,
    schema: 'datetime',
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
    displayAsText: i18n.translate('xpack.observability.alertsTGrid.reasonColumnDescription', {
      defaultMessage: 'Reason',
    }),
    id: ALERT_REASON,
    linkField: '*',
  },
];
