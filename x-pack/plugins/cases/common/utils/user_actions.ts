/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorUserAction } from '../api/cases/user_actions/connector';
import { PushedUserAction } from '../api/cases/user_actions/pushed';

export function isCreateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'create' && actionFields != null && actionFields.includes('connector');
}

export function isUpdateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'update' && actionFields != null && actionFields.includes('connector');
}

export function isPush(action?: string, actionFields?: string[]): boolean {
  return action === 'push-to-service' && actionFields != null && actionFields.includes('pushed');
}

/**
 * TODO: Fix unknown type
 * */
export const isConnectorUserAction = (userAction: unknown): userAction is ConnectorUserAction =>
  (userAction as ConnectorUserAction)?.payload?.connector != null;

export const isPushedUserAction = (userAction: unknown): userAction is PushedUserAction =>
  (userAction as PushedUserAction)?.payload?.externalService != null;
