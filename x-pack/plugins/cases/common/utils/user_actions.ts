/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnakeToCamelCase } from '../types';
import type {
  CategoryUserAction,
  CommentUserAction,
  ConnectorUserAction,
  CreateCaseUserAction,
  DescriptionUserAction,
  PushedUserAction,
  StatusUserAction,
  TagsUserAction,
  TitleUserAction,
  UserActionTypes,
} from '../types/domain';
import { UserActionActionTypes } from '../types/domain';

type SnakeCaseOrCamelCaseUserAction<
  T extends 'snakeCase' | 'camelCase',
  S,
  C
> = T extends 'snakeCase' ? S : C;

export const isConnectorUserAction = (userAction: unknown): userAction is ConnectorUserAction =>
  (userAction as ConnectorUserAction)?.type === UserActionActionTypes.connector &&
  (userAction as ConnectorUserAction)?.payload?.connector != null;

export const isPushedUserAction = <T extends 'snakeCase' | 'camelCase' = 'snakeCase'>(
  userAction: unknown
): userAction is SnakeCaseOrCamelCaseUserAction<
  T,
  PushedUserAction,
  SnakeToCamelCase<PushedUserAction>
> =>
  (userAction as PushedUserAction)?.type === UserActionActionTypes.pushed &&
  (userAction as PushedUserAction)?.payload?.externalService != null;

export const isTitleUserAction = (userAction: unknown): userAction is TitleUserAction =>
  (userAction as TitleUserAction)?.type === UserActionActionTypes.title &&
  (userAction as TitleUserAction)?.payload?.title != null;

export const isStatusUserAction = (userAction: unknown): userAction is StatusUserAction =>
  (userAction as StatusUserAction)?.type === UserActionActionTypes.status &&
  (userAction as StatusUserAction)?.payload?.status != null;

export const isTagsUserAction = (userAction: unknown): userAction is TagsUserAction =>
  (userAction as TagsUserAction)?.type === UserActionActionTypes.tags &&
  (userAction as TagsUserAction)?.payload?.tags != null;

export const isCommentUserAction = (userAction: unknown): userAction is CommentUserAction =>
  (userAction as CommentUserAction)?.type === UserActionActionTypes.comment &&
  (userAction as CommentUserAction)?.payload?.comment != null;

export const isDescriptionUserAction = (userAction: unknown): userAction is DescriptionUserAction =>
  (userAction as DescriptionUserAction)?.type === UserActionActionTypes.description &&
  (userAction as DescriptionUserAction)?.payload?.description != null;

export const isCreateCaseUserAction = (userAction: unknown): userAction is CreateCaseUserAction =>
  (userAction as CreateCaseUserAction)?.type === UserActionActionTypes.create_case &&
  /**
   * Connector is needed in various places across the application where
   * the isCreateCaseUserAction is being used.
   * Migrations should add the connector payload if it is
   * missing.
   */
  (userAction as CreateCaseUserAction)?.payload?.connector != null;

export const isUserActionType = (field: string): field is UserActionTypes =>
  UserActionActionTypes[field as UserActionTypes] != null;

export const isCategoryUserAction = (userAction: unknown): userAction is CategoryUserAction =>
  (userAction as CategoryUserAction)?.type === UserActionActionTypes.category &&
  (userAction as CategoryUserAction)?.payload?.category !== undefined;
