/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingRuntimeField } from '@elastic/elasticsearch/lib/api/types';
import { last } from 'lodash';
import { DEFAULT_DATA_VIEW_ID } from '../../../../common/constants';
import { mockSourcererState } from '../../mock';
import { addRuntimeField, removeRuntimeField } from './actions';
import { sourcererReducer } from './reducer';

describe('sourcererReducer', () => {
  const runtimeMapping: MappingRuntimeField = {
    script: {
      source: 'emit("test runtimeMapping")',
    },
    type: 'keyword',
  };
  const fieldName = 'field name';
  const fieldCategory = 'test category';
  const indexField = {
    aggregatable: false,
    category: fieldCategory,
    indexes: ['testIndex-*'],
    name: fieldName,
    searchable: true,
    type: 'string',
  };

  it('addRuntimeField', () => {
    const resultState = sourcererReducer(
      mockSourcererState,
      addRuntimeField({
        id: DEFAULT_DATA_VIEW_ID,
        indexField,
        runtimeMapping,
      })
    );

    expect(resultState.defaultDataView.runtimeMappings[fieldName]).toEqual(runtimeMapping);
    expect(resultState.defaultDataView.browserFields[fieldCategory].fields).toEqual({
      [fieldName]: indexField,
    });
    expect(last(resultState.defaultDataView.indexFields)?.name).toBe(fieldName);
  });

  it('removeRuntimeField', () => {
    const updatedState = sourcererReducer(
      mockSourcererState,
      addRuntimeField({
        id: DEFAULT_DATA_VIEW_ID,
        indexField,
        runtimeMapping,
      })
    );

    const resultState = sourcererReducer(
      updatedState,
      removeRuntimeField({
        id: DEFAULT_DATA_VIEW_ID,
        fieldName,
        fieldCategory,
      })
    );

    expect(resultState.defaultDataView.runtimeMappings[fieldName]).toBeUndefined();
    expect(resultState.defaultDataView.browserFields[fieldCategory].fields).toEqual({});
    expect(last(resultState.defaultDataView.indexFields)?.name).not.toBe(fieldName);
  });
});
