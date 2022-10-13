/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LEGACY_TO_CURRENT_SCHEMA_PATHS } from '../../../common/fleet';

export function translateLegacySchemaPaths(
  apmServerSchema: Record<string, any>
) {
  return Object.keys(apmServerSchema).reduce((acc, apmServerSchemaKey) => {
    const currentSchemaPath =
      LEGACY_TO_CURRENT_SCHEMA_PATHS[apmServerSchemaKey] || apmServerSchemaKey;
    return {
      ...acc,
      [currentSchemaPath]: apmServerSchema[apmServerSchemaKey],
    };
  }, {});
}
