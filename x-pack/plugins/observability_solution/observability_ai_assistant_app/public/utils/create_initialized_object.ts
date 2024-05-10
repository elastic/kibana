/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionDefinition } from '@kbn/observability-ai-assistant-plugin/common';

type Params = FunctionDefinition['parameters'];

export function createInitializedObject(parameters: Params) {
  const emptyObject: Record<string, string | any> = {};

  function traverseProperties({ properties, required }: Params) {
    for (const propName in properties) {
      if (properties.hasOwnProperty(propName)) {
        const prop = properties[propName] as Params;

        if (prop.type === 'object') {
          emptyObject[propName] = createInitializedObject(prop);
        } else if (required?.includes(propName)) {
          if (prop.type === 'array') {
            emptyObject[propName] = [];
          }

          if (prop.type === 'number') {
            emptyObject[propName] = 1;
          }

          if (prop.type === 'string') {
            emptyObject[propName] = '';
          }
        }
      }
    }
  }

  traverseProperties(parameters);

  return emptyObject;
}
