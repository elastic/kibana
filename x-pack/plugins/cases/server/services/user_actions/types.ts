/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from 'kibana/server';
import { User, UserAction, UserActionTypes } from '../../../common/api';

export interface CommonArguments {
  user: User;
  caseId: string;
  owner: string;
  subCaseId?: string;
  attachmentId?: string;
  connectorId?: string;
  action?: UserAction;
}

export type BuilderArgs = { payload: Record<string, any> } & CommonArguments;
export interface BuilderReturnValue {
  attributes: Record<string, unknown>;
  references: SavedObjectReference[];
}

export type CommonBuilderArguments = CommonArguments & {
  action: UserAction;
  type: UserActionTypes;
  value: unknown;
  valueKey: string;
  extraReferences?: SavedObjectReference[];
};
