/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaFeature } from '@kbn/features-plugin/server';

export function validateReservedPrivileges(features: KibanaFeature[]) {
  const seenPrivilegeIds = new Set<string>();

  for (const feature of features) {
    (feature?.reserved?.privileges ?? []).forEach(({ id }) => {
      if (seenPrivilegeIds.has(id)) {
        throw new Error(`Duplicate reserved privilege id detected: ${id}. This is not allowed.`);
      }
      seenPrivilegeIds.add(id);
    });
  }
}
