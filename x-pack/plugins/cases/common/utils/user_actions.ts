/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConnectorUserAction } from '../api/cases/user_actions/connector';
import { PushedUserAction } from '../api/cases/user_actions/pushed';
import { StatusUserAction } from '../api/cases/user_actions/status';
import { TagsUserAction } from '../api/cases/user_actions/tags';
import { TitleUserAction } from '../api/cases/user_actions/title';

export function isCreateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'create' && actionFields != null && actionFields.includes('connector');
}

export function isUpdateConnector(action?: string, actionFields?: string[]): boolean {
  return action === 'update' && actionFields != null && actionFields.includes('connector');
}

export function isPush(action?: string, actionFields?: string[]): boolean {
  return action === 'push_to_service' && actionFields != null && actionFields.includes('pushed');
}

type SnakeCaseOrCamelCaseUserAction<
  T extends 'snakeCase' | 'cameCase',
  S,
  C
> = T extends 'snakeCase' ? S : C;

type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S;

type SnakeToCamelCaseNested<T> = T extends object
  ? {
      [K in keyof T as SnakeToCamelCase<K & string>]: SnakeToCamelCaseNested<T[K]>;
    }
  : T;

/**
 * TODO: Ternary operation for cameCase/snakeCase
 * TODO: Check also the userAction.fields && userAction.action
 * */
export const isConnectorUserAction = (userAction: unknown): userAction is ConnectorUserAction =>
  (userAction as ConnectorUserAction)?.payload?.connector != null;

export const isPushedUserAction = <T extends 'snakeCase' | 'cameCase'>(
  userAction: unknown
): userAction is SnakeCaseOrCamelCaseUserAction<
  T,
  PushedUserAction,
  SnakeToCamelCaseNested<PushedUserAction>
> => (userAction as PushedUserAction)?.payload?.externalService != null;

export const isTitleUserAction = (userAction: unknown): userAction is TitleUserAction =>
  (userAction as TitleUserAction)?.payload?.title != null;

export const isStatusUserAction = (userAction: unknown): userAction is StatusUserAction =>
  (userAction as StatusUserAction)?.payload?.status != null;

export const isTagsUserAction = (userAction: unknown): userAction is TagsUserAction =>
  (userAction as TagsUserAction)?.payload?.tags != null;
