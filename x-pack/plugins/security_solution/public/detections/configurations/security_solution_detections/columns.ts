/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import {
  ALERT_HOST_CRITICALITY,
  ALERT_USER_CRITICALITY,
  ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
} from '../../../../common/field_maps/field_names';
import type { LicenseService } from '../../../../common/license';
import type { ColumnHeaderOptions } from '../../../../common/types';

import { defaultColumnHeaderType } from '../../../timelines/components/timeline/body/column_headers/default_headers';
import {
  DEFAULT_COLUMN_MIN_WIDTH,
  DEFAULT_DATE_COLUMN_MIN_WIDTH,
} from '../../../timelines/components/timeline/body/constants';

import * as i18n from '../../components/alerts_table/translations';
import {
  DEFAULT_TABLE_COLUMN_MIN_WIDTH,
  DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH,
} from './translations';

export const assigneesColumn: ColumnHeaderOptions = {
  columnHeaderType: defaultColumnHeaderType,
  displayAsText: i18n.ALERTS_HEADERS_ASSIGNEES,
  id: 'kibana.alert.workflow_assignee_ids',
  initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
};

export const hostRiskLevelColumn: ColumnHeaderOptions = {
  columnHeaderType: defaultColumnHeaderType,
  id: ALERT_HOST_RISK_SCORE_CALCULATED_LEVEL,
  displayAsText: i18n.ALERTS_HEADERS_HOST_RISK_LEVEL,
};

export const userRiskLevelColumn: ColumnHeaderOptions = {
  columnHeaderType: defaultColumnHeaderType,
  id: ALERT_USER_RISK_SCORE_CALCULATED_LEVEL,
  displayAsText: i18n.ALERTS_HEADERS_USER_RISK_LEVEL,
};

const getBaseColumns = (
  license?: LicenseService
): Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> => {
  const isPlatinumPlus = license?.isPlatinumPlus?.() ?? false;
  return [
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
    isPlatinumPlus ? hostRiskLevelColumn : null,
    isPlatinumPlus ? userRiskLevelColumn : null,
    isPlatinumPlus
      ? {
          columnHeaderType: defaultColumnHeaderType,
          id: ALERT_HOST_CRITICALITY,
          displayAsText: i18n.ALERTS_HEADERS_HOST_CRITICALITY,
        }
      : null,
    isPlatinumPlus
      ? {
          columnHeaderType: defaultColumnHeaderType,
          id: ALERT_USER_CRITICALITY,
          displayAsText: i18n.ALERTS_HEADERS_USER_CRITICALITY,
        }
      : null,
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
  ].filter((column) => column != null) as Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
};

/**
 * columns implements a subset of `EuiDataGrid`'s `EuiDataGridColumn` interface,
 * plus additional TGrid column properties
 */
export const getColumns = (
  license?: LicenseService
): Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> => [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH + 10,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.ALERTS_HEADERS_RULE,
    id: 'kibana.alert.rule.name',
    initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
    linkField: 'kibana.alert.rule.uuid',
  },
  assigneesColumn,
  ...getBaseColumns(license),
];

export const getRulePreviewColumns = (
  license?: LicenseService
): Array<
  Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> & ColumnHeaderOptions
> => [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'kibana.alert.original_time',
    initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH + 10,
  },
  ...getBaseColumns(license),
];

export const eventRenderedViewColumns: ColumnHeaderOptions[] = [
  {
    columnHeaderType: defaultColumnHeaderType,
    id: '@timestamp',
    displayAsText: i18n.EVENT_RENDERED_VIEW_COLUMNS.timestamp,
    initialWidth: DEFAULT_TABLE_DATE_COLUMN_MIN_WIDTH + 50,
    actions: false,
    isExpandable: false,
    isResizable: false,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    displayAsText: i18n.EVENT_RENDERED_VIEW_COLUMNS.rule,
    id: 'kibana.alert.rule.name',
    initialWidth: DEFAULT_TABLE_COLUMN_MIN_WIDTH + 50,
    linkField: 'kibana.alert.rule.uuid',
    actions: false,
    isExpandable: false,
    isResizable: false,
  },
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'eventSummary',
    displayAsText: i18n.EVENT_RENDERED_VIEW_COLUMNS.eventSummary,
    actions: false,
    isExpandable: false,
    isResizable: false,
  },
];
