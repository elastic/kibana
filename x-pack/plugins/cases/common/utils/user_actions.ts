/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isCreateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'create' && actionFields != null && actionFields.includes('connector');
}

export function isUpdateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'update' && actionFields != null && actionFields.includes('connector');
}

export function isPush(action?: string, actionFields?: string[]): boolean {
  return action === 'push-to-service' && actionFields != null && actionFields.includes('pushed');
}

export function isCreateComment(action?: string, actionFields?: string[]): boolean {
  return (
    action === 'create' &&
    actionFields !== null &&
    actionFields !== undefined &&
    actionFields.includes('comment')
  );
}
