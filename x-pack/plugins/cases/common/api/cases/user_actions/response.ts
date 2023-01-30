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
import { SeverityUserActionRt } from './severity';
import { AssigneesUserActionRt } from './assignees';

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

const CaseUserActionDeprecatedResponseRt = rt.intersection([
  CaseUserActionBasicRt,
  CaseUserActionInjectedDeprecatedIdsRt,
]);

/**
 * This includes the comment_id but not the action_id or case_id
 */
const CaseUserActionInjectedAttributesRt = rt.intersection([
  CaseUserActionBasicRt,
  CaseUserActionInjectedIdsRt,
]);

const CaseUserActionResponseRt = rt.intersection([
  CaseUserActionInjectedAttributesRt,
  rt.type({
    id: rt.string,
    version: rt.string,
  }),
]);

export const CaseUserActionAttributesRt = CaseUserActionBasicRt;
export const CaseUserActionsResponseRt = rt.array(CaseUserActionResponseRt);
export const CaseUserActionsDeprecatedResponseRt = rt.array(CaseUserActionDeprecatedResponseRt);

export type CaseUserActionAttributes = rt.TypeOf<typeof CaseUserActionAttributesRt>;
export type CaseUserActionAttributesWithoutConnectorId = rt.TypeOf<
  typeof CaseUserActionAttributesRt
>;
export type CaseUserActionsResponse = rt.TypeOf<typeof CaseUserActionsResponseRt>;
export type CaseUserActionResponse = rt.TypeOf<typeof CaseUserActionResponseRt>;
export type CaseUserActionsDeprecatedResponse = rt.TypeOf<
  typeof CaseUserActionsDeprecatedResponseRt
>;
export type CaseUserActionDeprecatedResponse = rt.TypeOf<typeof CaseUserActionDeprecatedResponseRt>;
export type CaseUserActionInjectedAttributes = rt.TypeOf<typeof CaseUserActionInjectedAttributesRt>;

export type UserAction = rt.TypeOf<typeof ActionsRt>;
export type UserActionTypes = ActionTypeValues;

export type CaseUserAction = rt.TypeOf<typeof CaseUserActionBasicRt>;
export type CaseUserActionWithoutConnectorId = rt.TypeOf<
  typeof CaseUserActionBasicWithoutConnectorIdRt
>;
