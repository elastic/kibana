/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCombinedProperties } from './use_pivot_data';
import { ES_FIELD_TYPES } from '@kbn/data-plugin/common';

describe('getCombinedProperties', () => {
  test('extracts missing mappings from docs', () => {
    const mappingProps = {
      testProp: {
        type: ES_FIELD_TYPES.STRING,
      },
    };

    const docs = [
      {
        testProp: 'test_value1',
        scriptProp: 1,
      },
      {
        testProp: 'test_value2',
        scriptProp: 2,
      },
      {
        testProp: 'test_value3',
        scriptProp: 3,
      },
    ];

    expect(getCombinedProperties(mappingProps, docs)).toEqual({
      testProp: {
        type: 'string',
      },
      scriptProp: {
        type: 'number',
      },
    });
  });

  test('does not override defined mappings', () => {
    const mappingProps = {
      testProp: {
        type: ES_FIELD_TYPES.STRING,
      },
      scriptProp: {
        type: ES_FIELD_TYPES.LONG,
      },
    };

    const docs = [
      {
        testProp: 'test_value1',
        scriptProp: 1,
      },
      {
        testProp: 'test_value2',
        scriptProp: 2,
      },
      {
        testProp: 'test_value3',
        scriptProp: 3,
      },
    ];

    expect(getCombinedProperties(mappingProps, docs)).toEqual({
      testProp: {
        type: 'string',
      },
      scriptProp: {
        type: 'long',
      },
    });
  });
});
