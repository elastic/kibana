/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SelectOperation } from '../../../common';

export interface IndexPatternField {
  name: string;
  type: string;
  aggregatable: boolean;
  searchable: boolean;
}

export interface IndexPattern {
  id: string;
  title: string;
  timeFieldName?: string;
  fields: IndexPatternField[];
  fieldFormatMap?: string;
}

export interface VisModelQuery {
  indexPattern: string;
  select: {
    [id: string]: SelectOperation;
  };
}

export interface Axis {
  title: string;
  columns: string[];
}

export interface IndexPatterns {
  [id: string]: IndexPattern;
}

/**
 * The complete state of the editor.
 * The basic properties which are shared over all editor plugins
 * are defined here, anything else is in the private property and scoped by plugin
 */
export interface VisModel<K extends string = any, T = any> {
  indexPatterns: IndexPatterns | null;
  queries: {
    [id: string]: VisModelQuery;
  };
  editorPlugin: string;
  title: string;
  private: { [key in K]: T };
}

// This type should be used if it is not known which private states exist on a VisModel
export type UnknownVisModel = VisModel<string, unknown>;

export function selectColumn(id: string, model: VisModel) {
  const [queryId] = id.split('_');
  const query = model.queries[queryId];

  return query ? query.select[id] : undefined;
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
    [id: string]: VisModelQuery;
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
    indexPatterns: null,
    queries: {},
    editorPlugin: 'xy_chart',
    title: '',
    private: {},
  };
}
