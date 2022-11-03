/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiDataGridColumn } from '@elastic/eui';
import * as runtimeTypes from 'io-ts';
import type { TGridModelSettings } from '../../../public/common/store/data_table/model';
import type { TGridModel } from '../../../public/common/store/data_table/types';
import type { ColumnHeaderOptions } from '../header_actions';

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export type SortDirectionTable = 'none' | 'asc' | 'desc' | Direction;
export interface SortColumnTable {
  columnId: string;
  columnType: string;
  esTypes?: string[];
  sortDirection: SortDirectionTable;
}

/** The state of all timelines is stored here */
export interface DataTableState {
  dataTable: TableState;
}

/** A map of id to data table  */
export interface TableById {
  [id: string]: TGridModel;
}
export interface TGridEpicDependencies<State> {
  // kibana$: Observable<CoreStart>;
  storage: Storage;
  tGridByIdSelector: () => (state: State, timelineId: string) => TGridModel;
}

/** The state of all data tables is stored here */
export interface TableState {
  tableById: TableById;
}

export enum TableId {
  usersPageEvents = 'users-page-events',
  hostsPageEvents = 'hosts-page-events',
  networkPageEvents = 'network-page-events',
  hostsPageSessions = 'hosts-page-sessions-v2', // the v2 is to cache bust localstorage settings as default columns were reworked.
  alertsOnRuleDetailsPage = 'alerts-rules-details-page',
  alertsOnAlertsPage = 'alerts-page',
  test = 'table-test', // Reserved for testing purposes
  alternateTest = 'alternateTest',
  rulePreview = 'rule-preview',
  kubernetesPageSessions = 'kubernetes-page-sessions',
}

export const TableIdLiteralRt = runtimeTypes.union([
  runtimeTypes.literal(TableId.usersPageEvents),
  runtimeTypes.literal(TableId.hostsPageEvents),
  runtimeTypes.literal(TableId.networkPageEvents),
  runtimeTypes.literal(TableId.hostsPageSessions),
  runtimeTypes.literal(TableId.alertsOnRuleDetailsPage),
  runtimeTypes.literal(TableId.alertsOnAlertsPage),
  runtimeTypes.literal(TableId.test),
  runtimeTypes.literal(TableId.rulePreview),
  runtimeTypes.literal(TableId.kubernetesPageSessions),
]);
export type TableIdLiteral = runtimeTypes.TypeOf<typeof TableIdLiteralRt>;

export interface InitialyzeTGridSettings extends Partial<TGridModelSettings> {
  id: string;
}

export interface TGridPersistInput extends Partial<Omit<TGridModel, keyof TGridModelSettings>> {
  id: string;
  columns: ColumnHeaderOptions[];
  indexNames: string[];
  showCheckboxes?: boolean;
  defaultColumns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  sort: SortColumnTable[];
}
