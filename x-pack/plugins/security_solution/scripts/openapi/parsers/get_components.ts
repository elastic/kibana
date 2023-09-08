/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenApiDocument } from './openapi_types';

export function getComponents(parsedSchema: OpenApiDocument) {
  if (parsedSchema.components?.['x-codegen-enabled'] === false) {
    return undefined;
  }
  return parsedSchema.components;
}
