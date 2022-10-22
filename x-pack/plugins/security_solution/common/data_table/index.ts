/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as runtimeTypes from 'io-ts';
import type { TGridModel } from '../../public/common/store/data_table/model';
import { Direction } from '../search_strategy';
import { unionWithNullType } from '../utility_types';

/** A map of id to data table  */
export interface TableById {
  [id: string]: TGridModel;
}

export type SetEventsLoading = (params: { eventIds: string[]; isLoading: boolean }) => void;
export type SetEventsDeleted = (params: { eventIds: string[]; isDeleted: boolean }) => void;

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

const SavedSortObject = runtimeTypes.partial({
  columnId: unionWithNullType(runtimeTypes.string),
  columnType: unionWithNullType(runtimeTypes.string),
  sortDirection: unionWithNullType(runtimeTypes.string),
});
const SavedSortRuntimeType = runtimeTypes.union([
  runtimeTypes.array(SavedSortObject),
  SavedSortObject,
]);

export type Sort = runtimeTypes.TypeOf<typeof SavedSortRuntimeType>;

export const pageInfoTimeline = runtimeTypes.type({
  pageIndex: runtimeTypes.number,
  pageSize: runtimeTypes.number,
});

export enum SortFieldTimeline {
  title = 'title',
  description = 'description',
  updated = 'updated',
  created = 'created',
}

export const sortFieldTimeline = runtimeTypes.union([
  runtimeTypes.literal(SortFieldTimeline.title),
  runtimeTypes.literal(SortFieldTimeline.description),
  runtimeTypes.literal(SortFieldTimeline.updated),
  runtimeTypes.literal(SortFieldTimeline.created),
]);

export const direction = runtimeTypes.union([
  runtimeTypes.literal(Direction.asc),
  runtimeTypes.literal(Direction.desc),
]);

export const sortTimeline = runtimeTypes.type({
  sortField: sortFieldTimeline,
  sortOrder: direction,
});
