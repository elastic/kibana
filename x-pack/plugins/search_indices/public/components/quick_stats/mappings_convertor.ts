/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Mappings } from '../../types';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';

interface VectorFieldTypes {
  semantic_text: number;
  dense_vector: number;
  sparse_vector: number;
}

export function countVectorBasedTypesFromMappings(mappings: Mappings): VectorFieldTypes {
  const typeCounts: VectorFieldTypes = {
    semantic_text: 0,
    dense_vector: 0,
    sparse_vector: 0,
  };

  const typeCountKeys = Object.keys(typeCounts);

  function recursiveCount(fields: any) {
    if (fields.mappings) {
      recursiveCount(fields.mappings);
    }
    if (fields.properties) {
      Object.keys(fields.properties).forEach((key) => {
        const value = fields.properties[key];

        if (value.type) {
          if (typeCountKeys.includes(value.type)) {
            typeCounts[value.type] = typeCounts[value.type] + 1;
          }

          // If the field has nested fields, continue recursion
          if (value.fields) {
            recursiveCount(value.fields);
          }

          // If the field has nested properties, continue recursion
          if (value.properties) {
            recursiveCount(value.properties);
          }
        } else if (value.properties || value.fields) {
          // In case the structure does not have a "type" field directly, but has properties or fields
          recursiveCount(value);
        }
      });
    }
  }

  recursiveCount(mappings);
  return typeCounts;
}
