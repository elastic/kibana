/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

interface MappingProperties {
  [key: string]: {
    type?: string;
    properties?: MappingProperties;
  };
}

/**
 * Resolves the type of a given field from its path in the provided mappings.
 */
export const getFieldTypeByPath = ({
  fieldPath,
  mappings,
}: {
  fieldPath: string;
  mappings: MappingTypeMapping;
}): string => {
  let properties: MappingProperties = mappings.properties ?? {};

  const paths = fieldPath.split('.');
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const isLast = i === paths.length - 1;
    if (isLast) {
      if (properties[path]?.type) {
        return properties[path]?.type!;
      } else {
        throw Error(`Field '${fieldPath}' not found in mappings`);
      }
    } else {
      if (properties[path]?.properties) {
        properties = properties[path]!.properties!;
      } else {
        throw Error(`Field '${fieldPath}' not found in mappings`);
      }
    }
  }
  throw Error(`Exited loop without return (should never happen)`);
};
