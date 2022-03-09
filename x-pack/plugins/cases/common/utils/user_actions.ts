/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ActionTypes,
  CommentUserAction,
  ConnectorUserAction,
  CreateCaseUserAction,
  DescriptionUserAction,
  PushedUserAction,
  StatusUserAction,
  TagsUserAction,
  TitleUserAction,
  UserActionTypes,
} from '../api';
import { SnakeToCamelCase } from '../types';

type SnakeCaseOrCamelCaseUserAction<
  T extends 'snakeCase' | 'camelCase',
  S,
  C
> = T extends 'snakeCase' ? S : C;

export const isConnectorUserAction = (userAction: unknown): userAction is ConnectorUserAction =>
  (userAction as ConnectorUserAction)?.type === ActionTypes.connector &&
  (userAction as ConnectorUserAction)?.payload?.connector != null;

export const isPushedUserAction = <T extends 'snakeCase' | 'camelCase' = 'snakeCase'>(
  userAction: unknown
): userAction is SnakeCaseOrCamelCaseUserAction<
  T,
  PushedUserAction,
  SnakeToCamelCase<PushedUserAction>
> =>
  (userAction as PushedUserAction)?.type === ActionTypes.pushed &&
  (userAction as PushedUserAction)?.payload?.externalService != null;

export const isTitleUserAction = (userAction: unknown): userAction is TitleUserAction =>
  (userAction as TitleUserAction)?.type === ActionTypes.title &&
  (userAction as TitleUserAction)?.payload?.title != null;

export const isStatusUserAction = (userAction: unknown): userAction is StatusUserAction =>
  (userAction as StatusUserAction)?.type === ActionTypes.status &&
  (userAction as StatusUserAction)?.payload?.status != null;

export const isTagsUserAction = (userAction: unknown): userAction is TagsUserAction =>
  (userAction as TagsUserAction)?.type === ActionTypes.tags &&
  (userAction as TagsUserAction)?.payload?.tags != null;

export const isCommentUserAction = (userAction: unknown): userAction is CommentUserAction =>
  (userAction as CommentUserAction)?.type === ActionTypes.comment &&
  (userAction as CommentUserAction)?.payload?.comment != null;

export const isDescriptionUserAction = (userAction: unknown): userAction is DescriptionUserAction =>
  (userAction as DescriptionUserAction)?.type === ActionTypes.description &&
  (userAction as DescriptionUserAction)?.payload?.description != null;

export const isCreateCaseUserAction = (userAction: unknown): userAction is CreateCaseUserAction =>
  (userAction as CreateCaseUserAction)?.type === ActionTypes.create_case &&
  /**
   * Connector is needed in various places across the application where
   * the isCreateCaseUserAction is being used.
   * Migrations should add the connector payload if it is
   * missing.
   */
  (userAction as CreateCaseUserAction)?.payload?.connector != null;

export const isUserActionType = (field: string): field is UserActionTypes =>
  ActionTypes[field as UserActionTypes] != null;
