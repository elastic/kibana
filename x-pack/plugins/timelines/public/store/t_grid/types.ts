/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridColumn } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { ColumnHeaderOptions, RowRendererId, SortColumnTable } from '../../../common/types';
import type { TGridModel, TGridModelSettings } from './model';

export type { TGridModel };

export interface AutoSavedWarningMsg {
  timelineId: string | null;
  newTimelineModel: TGridModel | null;
}

/** A map of id to timeline  */
export interface TableById {
  [id: string]: TGridModel;
}

export interface InsertTimeline {
  graphEventId?: string;
  timelineId: string;
  timelineSavedObjectId: string | null;
  timelineTitle: string;
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

export enum TableIds {
  usersPageEvents = 'users-page-events',
  hostsPageEvents = 'hosts-page-events',
  networkPageEvents = 'network-page-events',
  hostsPageSessions = 'hosts-page-sessions-v2',
  detectionsRulesDetailsPage = 'detections-rules-details-page',
  detectionsPage = 'detections-page',
  casePage = 'timeline-case',
  test = 'test', // Reserved for testing purposes
  alternateTest = 'alternateTest',
  kubernetesPageSessions = 'kubernetes-page-sessions',
}

export interface InitialyzeTGridSettings extends Partial<TGridModelSettings> {
  id: string;
}

export interface TGridPersistInput extends Partial<Omit<TGridModel, keyof TGridModelSettings>> {
  id: string;
  dateRange: {
    start: string;
    end: string;
  };
  columns: ColumnHeaderOptions[];
  indexNames: string[];
  showCheckboxes?: boolean;
  defaultColumns: Array<
    Pick<EuiDataGridColumn, 'display' | 'displayAsText' | 'id' | 'initialWidth'> &
      ColumnHeaderOptions
  >;
  sort: SortColumnTable[];
  excludedRowRendererIds: RowRendererId[];
}
