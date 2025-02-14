/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getEntityKuery(entity: Record<string, unknown>) {
  return Object.entries(entity)
    .map(([name, value]) => {
      return `(${name}:"${value}")`;
    })
    .join(' AND ');
}
