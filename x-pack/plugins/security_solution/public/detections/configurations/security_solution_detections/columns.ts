/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { ColumnHeaderOptions } from '../../../../common/types';

import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';

import * as i18n from '../../components/alerts_table/translations';

const baseColumns: Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> = [
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_RULE,
    id: 'kibana.alert.rule.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
    linkField: 'kibana.alert.rule.uuid',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_SEVERITY,
    id: 'kibana.alert.severity',
    initialWidth: 105,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_RISK_SCORE,
    id: 'kibana.alert.risk_score',
    initialWidth: 100,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_REASON,
    id: 'kibana.alert.reason',
    initialWidth: 450,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'host.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'user.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'process.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'file.name',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'source.ip',
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'destination.ip',
  },
];

/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
export const columns: Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH + 10,
  },
  ...baseColumns,
];

export const rulePreviewColumns: Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'kibana.original_event.time',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH + 10,
  },
  ...baseColumns,
];
