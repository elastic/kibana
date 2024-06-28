/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingDynamicTemplate, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

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

export function getPossibleMatchingDynamicTemplates({
  dynamicTemplates,
  field,
}: {
  dynamicTemplates: Array<Record<string, MappingDynamicTemplate>> | undefined;
  field: string;
}) {
  const possibleMatchingDynamicTemplates = [];
  if (dynamicTemplates) {
    for (const dynamicTemplate of dynamicTemplates) {
      const template = dynamicTemplate[Object.keys(dynamicTemplate)[0]];

      // Check the exact match condition
      if (template.match && template.match === field) {
        possibleMatchingDynamicTemplates.push(template);
        break;
      }

      // Check the path_match condition
      if (template.path_match) {
        const pathMatches = Array.isArray(template.path_match)
          ? template.path_match
          : [template.path_match];
        for (const pathMatch of pathMatches) {
          if (matchesPattern(pathMatch, field)) {
            possibleMatchingDynamicTemplates.push(template);
            break;
          }
        }
      }
    }
  }
  return possibleMatchingDynamicTemplates;
}

function matchesPattern(pattern: string, value: string): boolean {
  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);
  return regex.test(value);
}
