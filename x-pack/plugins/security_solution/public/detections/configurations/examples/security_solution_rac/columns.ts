/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';

import { defaultColumnHeaderType } from '../../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../../../timelines/components/timeline/body/constants';
import { ColumnHeaderOptions } from '../../../../timelines/store/timeline/model';

import * as i18n from '../../../components/alerts_table/translations';

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
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH + 5,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.name',
    displayAsText: i18n.ALERTS_HEADERS_RULE_NAME,
    linkField: 'signal.rule.id',
    initialWidth: 212,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.rule.severity',
    displayAsText: i18n.ALERTS_HEADERS_SEVERITY,
    initialWidth: 104,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'signal.reason',
    displayAsText: i18n.ALERTS_HEADERS_REASON,
    initialWidth: 644,
  },
];
