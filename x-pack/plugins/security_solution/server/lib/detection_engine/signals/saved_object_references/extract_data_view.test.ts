/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractDataView } from './extract_data_view';

describe('extract_data_view', () => {
  type FuncReturn = ReturnType<typeof extractDataView>;

  test('it returns an empty array if "dataViewId" being null', () => {
    expect(extractDataView({ dataViewId: null })).toEqual<FuncReturn>([]);
  });

  test('it returns an empty array if "dataViewId" is not defined', () => {
    expect(extractDataView({ dataViewId: undefined })).toEqual<FuncReturn>([]);
  });

  test('it returns an empty array if "dataViewId" is empty string', () => {
    expect(extractDataView({ dataViewId: ' ' })).toEqual<FuncReturn>([]);
  });

  test('It returns exception list transformed into a saved object references', () => {
    expect(extractDataView({ dataViewId: 'logs-*' })).toEqual<FuncReturn>([
      {
        id: 'logs-*',
        name: 'dataViewId_0',
        type: 'index-pattern',
      },
    ]);
  });
});
