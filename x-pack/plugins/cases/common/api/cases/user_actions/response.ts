/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import type { ActionsRt, ActionTypeValues } from './common';

import {
  CaseUserActionInjectedIdsRt,
  CaseUserActionInjectedDeprecatedIdsRt,
  UserActionCommonAttributesRt,
} from './common';
import { CreateCaseUserActionRt, CreateCaseUserActionWithoutConnectorIdRt } from './create_case';
import { DescriptionUserActionRt } from './description';
import { CommentUserActionRt } from './comment';
import { ConnectorUserActionRt, ConnectorUserActionWithoutConnectorIdRt } from './connector';
import { PushedUserActionRt, PushedUserActionWithoutConnectorIdRt } from './pushed';
import { TagsUserActionRt } from './tags';
import { TitleUserActionRt } from './title';
import { SettingsUserActionRt } from './settings';
import { StatusUserActionRt } from './status';
import { DeleteCaseUserActionRt } from './delete_case';
import { SeverityUserActionRt } from './severity';
import { AssigneesUserActionRt } from './assignees';
import { CaseUserActionStatsRt } from './stats';

const CommonUserActionsRt = rt.union([
  DescriptionUserActionRt,
  CommentUserActionRt,
  TagsUserActionRt,
  TitleUserActionRt,
  SettingsUserActionRt,
  StatusUserActionRt,
  SeverityUserActionRt,
  AssigneesUserActionRt,
]);

const UserActionPayloadRt = rt.union([
  CommonUserActionsRt,
  CreateCaseUserActionRt,
  ConnectorUserActionRt,
  PushedUserActionRt,
  DeleteCaseUserActionRt,
]);

const UserActionsWithoutConnectorIdRt = rt.union([
  CommonUserActionsRt,
  CreateCaseUserActionWithoutConnectorIdRt,
  ConnectorUserActionWithoutConnectorIdRt,
  PushedUserActionWithoutConnectorIdRt,
  DeleteCaseUserActionRt,
]);

const CaseUserActionBasicRt = rt.intersection([UserActionPayloadRt, UserActionCommonAttributesRt]);
const CaseUserActionBasicWithoutConnectorIdRt = rt.intersection([
  UserActionsWithoutConnectorIdRt,
  UserActionCommonAttributesRt,
]);

const CaseUserActionDeprecatedResponseRt = rt.intersection([
  CaseUserActionBasicRt,
  CaseUserActionInjectedDeprecatedIdsRt,
]);

/**
 * This includes the comment_id but not the action_id or case_id
 */
export const UserActionAttributesRt = rt.intersection([
  CaseUserActionBasicRt,
  CaseUserActionInjectedIdsRt,
]);

const UserActionRt = rt.intersection([
  UserActionAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const UserActionsRt = rt.array(UserActionRt);
export const CaseUserActionsDeprecatedResponseRt = rt.array(CaseUserActionDeprecatedResponseRt);
export const CaseUserActionStatsResponseRt = CaseUserActionStatsRt;

export type CaseUserActionAttributesWithoutConnectorId = rt.TypeOf<
  typeof CaseUserActionBasicWithoutConnectorIdRt
>;
export type CaseUserActionStatsResponse = rt.TypeOf<typeof CaseUserActionStatsRt>;
export type UserActions = rt.TypeOf<typeof UserActionsRt>;
export type UserAction = rt.TypeOf<typeof UserActionRt>;
export type CaseUserActionsDeprecatedResponse = rt.TypeOf<
  typeof CaseUserActionsDeprecatedResponseRt
>;
export type CaseUserActionDeprecatedResponse = rt.TypeOf<typeof CaseUserActionDeprecatedResponseRt>;
export type UserActionAttributes = rt.TypeOf<typeof UserActionAttributesRt>;

/**
 * This defines the high level category for the user action. Whether the user add, removed, updated something
 */
export type ActionCategory = rt.TypeOf<typeof ActionsRt>;
/**
 * This defines the type of the user action, meaning what individual action was taken, for example changing the status,
 * adding an assignee etc.
 */
export type UserActionTypes = ActionTypeValues;
