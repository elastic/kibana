/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ColumnHeaderOptions, SortColumnTable } from '../../../common/types';
import type { TGridModel, TGridModelSettings } from './model';

export type { TGridModel };

/** A map of id to data table  */
export interface TableById {
  [id: string]: TGridModel;
}

export const EMPTY_TABLE_BY_ID: TableById = {}; // stable reference

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
  hostsPageSessions = 'hosts-page-sessions-v2',
  alertsOnRuleDetailsPage = 'alerts-rules-details-page',
  alertsOnAlertsPage = 'alerts-page',
  casePage = 'timeline-case',
  test = 'table-test', // Reserved for testing purposes
  alternateTest = 'alternateTest',
  kubernetesPageSessions = 'kubernetes-page-sessions',
}

export enum TimelineId {
  active = 'timeline-1',
  casePage = 'timeline-case',
  detectionsAlertDetailsPage = 'detections-alert-details-page',
  test = 'timeline-test', // Reserved for testing purposes
}

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
