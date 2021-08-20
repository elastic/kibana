/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isCreateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'create' && actionFields?.includes('connector') === true;
}

export function isUpdateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'update' && actionFields?.includes('connector') === true;
}

export function isPush(action?: string, actionFields?: string[]): boolean {
  return action === 'push-to-service' && actionFields?.includes('pushed') === true;
}
