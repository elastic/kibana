/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { firstValueFrom, from, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { CoreStart } from '@kbn/core/public';
import { FieldSpec } from '@kbn/data-plugin/common';
import { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { Pick2 } from '../../common/utility_types';

type MockIndexPattern = Pick<
  DataView,
  'id' | 'title' | 'type' | 'getTimeField' | 'isTimeBased' | 'getFieldByName' | 'getComputedFields'
>;
export type MockIndexPatternSpec = Pick<DataView, 'id' | 'title' | 'type' | 'timeFieldName'> & {
  fields: FieldSpec[];
};

export const MockIndexPatternsKibanaContextProvider: React.FC<{
  asyncDelay: number;
  mockIndexPatterns: MockIndexPatternSpec[];
}> = ({ asyncDelay, children, mockIndexPatterns }) => {
  const indexPatterns = useMemo(
    () => createIndexPatternsMock(asyncDelay, mockIndexPatterns.map(createIndexPatternMock)),
    [asyncDelay, mockIndexPatterns]
  );

  const core = useMemo<Pick2<CoreStart, 'application', 'getUrlForApp'>>(
    () => ({
      application: {
        getUrlForApp: () => '',
      },
    }),
    []
  );

  return (
    <KibanaContextProvider services={{ ...core, data: { indexPatterns } }}>
      {children}
    </KibanaContextProvider>
  );
};

export const createIndexPatternsMock = (
  asyncDelay: number,
  indexPatterns: MockIndexPattern[]
): {
  getIdsWithTitle: DataViewsContract['getIdsWithTitle'];
  get: (...args: Parameters<DataViewsContract['get']>) => Promise<MockIndexPattern>;
} => {
  return {
    async getIdsWithTitle(_refresh?: boolean) {
      const indexPatterns$ = of(
        indexPatterns.map(({ id = 'unknown_id', title }) => ({ id, title }))
      );
      return await firstValueFrom(indexPatterns$.pipe(delay(asyncDelay)));
    },
    async get(indexPatternId: string) {
      const indexPatterns$ = from(
        indexPatterns.filter((indexPattern) => indexPattern.id === indexPatternId)
      );
      return await firstValueFrom(indexPatterns$.pipe(delay(asyncDelay)));
    },
  };
};

export const createIndexPatternMock = ({
  id,
  title,
  type = undefined,
  fields,
  timeFieldName,
}: MockIndexPatternSpec): MockIndexPattern => {
  const indexPatternFields = fields.map((fieldSpec) => new DataViewField(fieldSpec));

  return {
    id,
    title,
    type,
    getTimeField: () => indexPatternFields.find(({ name }) => name === timeFieldName),
    isTimeBased: () => timeFieldName != null,
    getFieldByName: (fieldName) => indexPatternFields.find(({ name }) => name === fieldName),
    getComputedFields: () => ({
      docvalueFields: [],
      runtimeFields: indexPatternFields.reduce((accumulatedRuntimeFields, field) => {
        if (field.runtimeField != null) {
          return {
            ...accumulatedRuntimeFields,
            [field.name]: field.runtimeField,
          };
        }
        return accumulatedRuntimeFields;
      }, {}),
      scriptFields: {},
      storedFields: [],
    }),
  };
};
