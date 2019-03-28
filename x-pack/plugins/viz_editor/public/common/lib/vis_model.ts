/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query, SelectOperation } from '../../../common';

export interface Field {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface Datasource<M = any> {
  id: string;
  title: string;
  timeFieldName?: string;
  fields: Field[];
  fieldFormatMap?: string;
  meta?: M;
}

export interface VisModelQuery {
  datasourceRef: string;
  select: {
    [id: string]: SelectOperation;
  };
}

export interface Axis {
  title: string;
  columns: string[];
}

/**
 * The complete state of the editor.
 * The basic properties which are shared over all editor plugins
 * are defined here, anything else is in the private property and scoped by plugin
 */
export interface VisModel<K extends string = any, T = any> {
  datasource: Datasource | null;
  queries: { [id: string]: Query };
  datasourcePlugin: string;
  editorPlugin: string;
  title: string;
  private: { [key in K]: T };
}

// This type should be used if it is not known which private states exist on a VisModel
export type UnknownVisModel = VisModel<string, unknown>;

export function selectColumn(id: string, model: VisModel) {
  const [queryId, columnIndex] = id.split('_');
  const query = model.queries[queryId];

  return query ? query.select[parseInt(columnIndex, 10)] : undefined;
}

export function updatePrivateState<K extends string, T>(name: K) {
  return (visModel: VisModel, privateStateUpdate: Partial<T>) => {
    return {
      ...visModel,
      private: {
        ...visModel.private,
        [name]: { ...visModel.private[name], ...privateStateUpdate },
      },
    } as VisModel<K, T>;
  };
}

export function getColumnIdByIndex(
  queries: {
    [id: string]: Query;
  },
  queryIndex: number,
  columnIndex: number
): string | undefined {
  const queryId = Object.keys(queries).sort()[queryIndex];
  if (queryId) {
    const query = queries[queryId];
    return Object.keys(query.select).sort()[columnIndex];
  }
}

// Generate our dummy-data
export function initialState(): VisModel<any, any> {
  return {
    datasource: null,
    queries: {},
    editorPlugin: 'xy_chart',
    datasourcePlugin: 'index_pattern',
    title: '',
    private: {},
  };
}
