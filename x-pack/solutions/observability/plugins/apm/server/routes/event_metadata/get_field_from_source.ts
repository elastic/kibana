/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

/**
 * Reads a dotted field path from a document `_source`, accounting for the two
 * shapes it can take depending on the ingest path:
 *
 * - OTel documents keep attribute names as flattened dotted keys INSIDE the
 *   `attributes` (or `resource.attributes`) object, e.g.
 *   `_source.attributes['gen_ai.input.messages']`.
 * - Classic APM documents store fully nested objects, e.g.
 *   `_source.span.id`.
 */
export function getFieldFromSource(source: unknown, fieldName: string): unknown {
  if (source == null || typeof source !== 'object') {
    return undefined;
  }

  // Flattened key inside a top-level container, e.g.
  // 'attributes.gen_ai.input.messages' -> source.attributes['gen_ai.input.messages']
  const separatorIndex = fieldName.indexOf('.');
  if (separatorIndex > 0) {
    const container = (source as Record<string, unknown>)[fieldName.slice(0, separatorIndex)];
    if (container != null && typeof container === 'object') {
      const flattenedValue = (container as Record<string, unknown>)[
        fieldName.slice(separatorIndex + 1)
      ];
      if (flattenedValue !== undefined) {
        return flattenedValue;
      }
    }
  }

  // Fully nested path (also covers a fully flattened top-level key via get()).
  return get(source, fieldName);
}
