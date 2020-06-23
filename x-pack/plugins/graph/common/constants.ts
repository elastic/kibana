/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const APP_ICON = 'graphApp';

export function createWorkspacePath(id: string) {
  return `/app/graph#/workspace/${id}`;
}
