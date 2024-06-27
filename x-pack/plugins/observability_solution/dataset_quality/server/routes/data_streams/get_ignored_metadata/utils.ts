/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

export function getMappingForField(mapping: MappingTypeMapping, path: string) {
  const pathParts = path.split('.');
  let currentObject = mapping.properties ?? {};

  for (const part of pathParts) {
    if (currentObject[part]) {
      if ('properties' in currentObject[part]) {
        currentObject = (currentObject[part] as any).properties;
      } else if ('fields' in currentObject[part]) {
        currentObject = (currentObject[part] as any).fields;
      } else {
        return currentObject[part]; // Return the final field mapping
      }
    } else {
      return undefined; // Path does not exist
    }
  }

  return currentObject;
}
