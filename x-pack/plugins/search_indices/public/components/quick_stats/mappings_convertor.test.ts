/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Mappings } from '../../types';
import { countVectorBasedTypesFromMappings } from './mappings_convertor';

describe('mappings convertor', () => {
  it('should count vector based types from mappings', () => {
    const mappings = {
      mappings: {
        properties: {
          field1: {
            type: 'dense_vector',
          },
          field2: {
            type: 'dense_vector',
          },
          field3: {
            type: 'sparse_vector',
          },
          field4: {
            type: 'dense_vector',
          },
          field5: {
            type: 'semantic_text',
          },
        },
      },
    };
    const result = countVectorBasedTypesFromMappings(mappings as unknown as Mappings);
    expect(result).toEqual({
      dense_vector: 3,
      sparse_vector: 1,
      semantic_text: 1,
    });
  });
});
