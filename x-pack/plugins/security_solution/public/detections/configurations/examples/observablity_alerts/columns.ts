/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { ALERT_DURATION, ALERT_REASON, ALERT_STATUS } from '@kbn/rule-data-utils';

import { ColumnHeaderOptions } from '../../../../../common/types';
import { defaultColumnHeaderType } from '../../../../timelines/components/timeline/body/column_headers/default_headers';
import { DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../../../../timelines/components/timeline/body/constants';

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
    displayAsText: i18n.STATUS,
    id: ALERT_STATUS,
    initialWidth: 74,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.TRIGGERED,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH + 5,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERT_DURATION,
    id: ALERT_DURATION,
    initialWidth: 116,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_SEVERITY,
    id: 'signal.rule.severity',
    initialWidth: 102,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_REASON,
    id: ALERT_REASON,
  },
];
