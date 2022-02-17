/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import {
  ActionsRt,
  UserActionCommonAttributesRt,
  CaseUserActionSavedObjectIdsRt,
  ActionTypesRt,
} from './common';
import { CreateCaseUserActionRt } from './create_case';
import { DescriptionUserActionRt } from './description';
import { CommentUserActionRt } from './comment';
import { ConnectorUserActionRt } from './connector';
import { PushedUserActionRt } from './pushed';
import { TagsUserActionRt } from './tags';
import { TitleUserActionRt } from './title';
import { SettingsUserActionRt } from './settings';
import { StatusUserActionRt } from './status';
import { DeleteCaseUserActionRt } from './delete_case';

export * from './common';
export * from './comment';
export * from './connector';
export * from './create_case';
export * from './delete_case';
export * from './description';
export * from './pushed';
export * from './settings';
export * from './status';
export * from './tags';
export * from './title';

const CommonUserActionsRt = rt.union([
  DescriptionUserActionRt,
  CommentUserActionRt,
  TagsUserActionRt,
  TitleUserActionRt,
  SettingsUserActionRt,
  StatusUserActionRt,
]);

export const UserActionsRt = rt.union([
  CommonUserActionsRt,
  CreateCaseUserActionRt,
  ConnectorUserActionRt,
  PushedUserActionRt,
  DeleteCaseUserActionRt,
]);

export const UserActionsWithoutConnectorIdRt = rt.union([
  CommonUserActionsRt,
  CreateCaseUserActionRt,
  ConnectorUserActionRt,
  PushedUserActionRt,
  DeleteCaseUserActionRt,
]);

const CaseUserActionBasicRt = rt.intersection([UserActionsRt, UserActionCommonAttributesRt]);
const CaseUserActionBasicWithoutConnectorIdRt = rt.intersection([
  UserActionsWithoutConnectorIdRt,
  UserActionCommonAttributesRt,
]);

const CaseUserActionResponseRt = rt.intersection([
  CaseUserActionBasicRt,
  CaseUserActionSavedObjectIdsRt,
]);

export const CaseUserActionAttributesRt = CaseUserActionBasicRt;
export const CaseUserActionsResponseRt = rt.array(CaseUserActionResponseRt);

export type CaseUserActionAttributes = rt.TypeOf<typeof CaseUserActionAttributesRt>;
export type CaseUserActionAttributesWithoutConnectorId = rt.TypeOf<
  typeof CaseUserActionAttributesRt
>;
export type CaseUserActionsResponse = rt.TypeOf<typeof CaseUserActionsResponseRt>;
export type CaseUserActionResponse = rt.TypeOf<typeof CaseUserActionResponseRt>;

export type UserAction = rt.TypeOf<typeof ActionsRt>;
export type UserActionTypes = rt.TypeOf<typeof ActionTypesRt>;

export type CaseUserAction = rt.TypeOf<typeof CaseUserActionBasicRt>;
export type CaseUserActionWithoutConnectorId = rt.TypeOf<
  typeof CaseUserActionBasicWithoutConnectorIdRt
>;
