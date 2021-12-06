/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import { FieldsRt, ActionsRt, FieldTypeRt, UserActionCommonAttributesRt } from './common';
import { CreateCaseUserActionRt } from './create_case';
import { DescriptionUserActionRt, DescriptionUserActionPayloadRt } from './description';
import { CommentUserActionRt, CommentUserActionPayloadRt } from './comment';
import { ConnectorUserActionRt, ConnectorUserActionPayloadRt } from './connector';
import { PushedUserActionRt, PushedUserActionPayloadRt } from './pushed';
import { TagsUserActionRt, TagsUserActionPayloadRt } from './tags';
import { TitleUserActionRt, TitleUserActionPayloadRt } from './title';
import { SettingsUserActionRt, SettingsUserActionPayloadRt } from './settings';
import { StatusUserActionRt, StatusUserActionPayloadRt } from './status';

export * from './common';
export * from './description';

export const UserActionsRt = rt.union([
  CreateCaseUserActionRt,
  DescriptionUserActionRt,
  CommentUserActionRt,
  ConnectorUserActionRt,
  PushedUserActionRt,
  TagsUserActionRt,
  TitleUserActionRt,
  SettingsUserActionRt,
  StatusUserActionRt,
]);

const CaseUserActionBasicRt = rt.intersection([UserActionsRt, UserActionCommonAttributesRt]);

const CaseUserActionResponseRt = rt.intersection([
  CaseUserActionBasicRt,
  rt.type({
    action_id: rt.string,
    case_id: rt.string,
    comment_id: rt.union([rt.string, rt.null]),
  }),
  rt.partial({ sub_case_id: rt.string }),
]);

const CaseUserActionESRt = rt.type({
  fields: rt.array(FieldTypeRt),
  action: ActionsRt,
  payload: rt.partial({
    description: DescriptionUserActionPayloadRt,
    comment: CommentUserActionPayloadRt,
    connector: ConnectorUserActionPayloadRt,
    externalService: PushedUserActionPayloadRt,
    tags: TagsUserActionPayloadRt,
    title: TitleUserActionPayloadRt,
    settings: SettingsUserActionPayloadRt,
    status: StatusUserActionPayloadRt,
  }),
});

export const CaseUserActionAttributesRt = CaseUserActionBasicRt;
export const CaseUserActionsResponseRt = rt.array(CaseUserActionResponseRt);

export type CaseUserActionAttributes = rt.TypeOf<typeof CaseUserActionAttributesRt>;
export type CaseUserActionsResponse = rt.TypeOf<typeof CaseUserActionsResponseRt>;
export type CaseUserActionResponse = rt.TypeOf<typeof CaseUserActionResponseRt>;

export type UserAction = rt.TypeOf<typeof ActionsRt>;
export type UserActionField = rt.TypeOf<typeof FieldsRt>;
export type UserActionFieldType = rt.TypeOf<typeof FieldTypeRt>;

export type CaseUserActionResponseES = rt.TypeOf<typeof CaseUserActionESRt>;
export type CaseUserAction = rt.TypeOf<typeof CaseUserActionBasicRt>;
