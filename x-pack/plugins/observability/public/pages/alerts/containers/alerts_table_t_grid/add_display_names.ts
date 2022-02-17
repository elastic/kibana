/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ALERT_DURATION, ALERT_REASON, ALERT_STATUS, TIMESTAMP } from '@kbn/rule-data-utils';
import { EuiDataGridColumn } from '@elastic/eui';
import { translations } from '../../../../config';
import type { ColumnHeaderOptions } from '../../../../../../timelines/common';

export const addDisplayNames = (
  column: Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
    ColumnHeaderOptions
) => {
  if (column.id === ALERT_REASON) {
    return { ...column, displayAsText: translations.alertsTable.reasonColumnDescription };
  }
  if (column.id === ALERT_DURATION) {
    return { ...column, displayAsText: translations.alertsTable.durationColumnDescription };
  }
  if (column.id === ALERT_STATUS) {
    return { ...column, displayAsText: translations.alertsTable.statusColumnDescription };
  }
  if (column.id === TIMESTAMP) {
    return { ...column, displayAsText: translations.alertsTable.lastUpdatedColumnDescription };
  }
  return column;
};
