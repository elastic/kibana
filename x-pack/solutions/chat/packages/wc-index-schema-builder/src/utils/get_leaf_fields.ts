/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping, MappingProperty } from '@elastic/elasticsearch/lib/api/types';

export type FieldType = Extract<MappingProperty, { type: string }>['type'];

export interface MappingField {
  path: string;
  type: FieldType;
}

export interface MappingProperties {
  [key: string]: {
    type?: string; // Leaf field (e.g., "text", "keyword", etc.)
    properties?: MappingProperties; // Nested object fields
  };
}

export const getLeafFields = ({ mappings }: { mappings: MappingTypeMapping }): MappingField[] => {
  const properties: MappingProperties = mappings.properties ?? {};

  function extractFields(obj: MappingProperties, prefix = ''): MappingField[] {
    let fields: MappingField[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;

      if (value.type) {
        // If it's a leaf field, add it
        fields.push({
          type: value.type as FieldType,
          path: fieldPath,
        });
      } else if (value.properties) {
        // If it's an object, go deeper
        fields = fields.concat(extractFields(value.properties, fieldPath));
      }
    }

    return fields;
  }

  return extractFields(properties);
};
