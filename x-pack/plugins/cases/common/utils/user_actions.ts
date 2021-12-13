/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionTypes, UserActionTypes } from '../api';
import { CommentUserAction } from '../api/cases/user_actions/comment';
import { ConnectorUserAction } from '../api/cases/user_actions/connector';
import { CreateCaseUserAction } from '../api/cases/user_actions/create_case';
import { DescriptionUserAction } from '../api/cases/user_actions/description';
import { PushedUserAction } from '../api/cases/user_actions/pushed';
import { StatusUserAction } from '../api/cases/user_actions/status';
import { TagsUserAction } from '../api/cases/user_actions/tags';
import { TitleUserAction } from '../api/cases/user_actions/title';
import { SnakeToCamelCase } from '../types';

type SnakeCaseOrCamelCaseUserAction<
  T extends 'snakeCase' | 'camelCase',
  S,
  C
> = T extends 'snakeCase' ? S : C;

/**
 * TODO: Ternary operation for camelCase/snakeCase
 * */
export const isConnectorUserAction = (userAction: unknown): userAction is ConnectorUserAction =>
  (userAction as ConnectorUserAction)?.type === ActionTypes.connector &&
  (userAction as ConnectorUserAction)?.payload?.connector != null;

export const isPushedUserAction = <T extends 'snakeCase' | 'camelCase'>(
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
  (userAction as CreateCaseUserAction)?.type === ActionTypes.create_case;

export const isUserActionType = (field: string): field is UserActionTypes =>
  ActionTypes[field as UserActionTypes] != null;
