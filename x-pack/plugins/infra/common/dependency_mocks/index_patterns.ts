/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { DataView, DataViewsContract } from '../../../../../src/plugins/data_views/common';
import { fieldList, FieldSpec, RuntimeField } from '../../../../../src/plugins/data/common';

type IndexPatternMock = Pick<
  DataView,
  | 'fields'
  | 'getComputedFields'
  | 'getFieldByName'
  | 'getTimeField'
  | 'id'
  | 'isTimeBased'
  | 'title'
  | 'type'
>;
type IndexPatternMockSpec = Pick<DataView, 'id' | 'title' | 'type' | 'timeFieldName'> & {
  fields: FieldSpec[];
};

export const createIndexPatternMock = ({
  id,
  title,
  type = undefined,
  fields,
  timeFieldName,
}: IndexPatternMockSpec): IndexPatternMock => {
  const indexPatternFieldList = fieldList(fields);

  return {
    id,
    title,
    type,
    fields: indexPatternFieldList,
    getTimeField: () => indexPatternFieldList.find(({ name }) => name === timeFieldName),
    isTimeBased: () => timeFieldName != null,
    getFieldByName: (fieldName) => indexPatternFieldList.find(({ name }) => name === fieldName),
    getComputedFields: () => ({
      runtimeFields: indexPatternFieldList.reduce<Record<string, RuntimeField>>(
        (accumulatedFields, { name, runtimeField }) => ({
          ...accumulatedFields,
          ...(runtimeField != null
            ? {
                [name]: runtimeField,
              }
            : {}),
        }),
        {}
      ),
      scriptFields: {},
      storedFields: [],
      docvalueFields: [],
    }),
  };
};

export const createIndexPatternsMock = (
  asyncDelay: number,
  indexPatterns: IndexPatternMock[]
): {
  getIdsWithTitle: DataViewsContract['getIdsWithTitle'];
  get: (...args: Parameters<DataViewsContract['get']>) => Promise<IndexPatternMock>;
} => {
  return {
    async getIdsWithTitle(_refresh?: boolean) {
      const indexPatterns$ = of(
        indexPatterns.map(({ id = 'unknown_id', title }) => ({ id, title }))
      );
      return await indexPatterns$.pipe(delay(asyncDelay)).toPromise();
    },
    async get(indexPatternId: string) {
      const indexPatterns$ = from(
        indexPatterns.filter((indexPattern) => indexPattern.id === indexPatternId)
      );
      return await indexPatterns$.pipe(delay(asyncDelay)).toPromise();
    },
  };
};

export const createIndexPatternsStartMock = (
  asyncDelay: number,
  indexPatterns: IndexPatternMock[]
): any => {
  return {
    indexPatternsServiceFactory: async () => createIndexPatternsMock(asyncDelay, indexPatterns),
  };
};
