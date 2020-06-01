/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentMetadata } from '../../../../types';

export function flattenMetadata(metadata: AgentMetadata) {
  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (typeof value === 'string') {
      acc[key] = value;

      return acc;
    }

    Object.entries(flattenMetadata(value)).forEach(([flattenedKey, flattenedValue]) => {
      acc[`${key}.${flattenedKey}`] = flattenedValue;
    });

    return acc;
  }, {} as { [k: string]: string });
}
export function unflattenMetadata(flattened: { [k: string]: string }) {
  const metadata: AgentMetadata = {};

  Object.entries(flattened).forEach(([flattenedKey, flattenedValue]) => {
    const keyParts = flattenedKey.split('.');
    const lastKey = keyParts.pop();

    if (!lastKey) {
      throw new Error('Invalid metadata');
    }

    let metadataPart = metadata;
    keyParts.forEach((keyPart) => {
      if (!metadataPart[keyPart]) {
        metadataPart[keyPart] = {};
      }

      metadataPart = metadataPart[keyPart] as AgentMetadata;
    });
    metadataPart[lastKey] = flattenedValue;
  });

  return metadata;
}
