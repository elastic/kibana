/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectReference } from '@kbn/core/server';
import {
  CasePostRequest,
  CaseSettings,
  CaseStatuses,
  CommentUserAction,
  ConnectorUserAction,
  PushedUserAction,
  User,
  UserAction,
  UserActionTypes,
} from '../../../common/api';

export interface BuilderParameters {
  title: {
    parameters: { payload: { title: string } };
  };
  description: {
    parameters: { payload: { description: string } };
  };
  status: {
    parameters: { payload: { status: CaseStatuses } };
  };
  tags: {
    parameters: { payload: { tags: string[] } };
  };
  pushed: {
    parameters: {
      payload: {
        externalService: PushedUserAction['payload']['externalService'];
      };
    };
  };
  settings: {
    parameters: { payload: { settings: CaseSettings } };
  };
  comment: {
    parameters: {
      payload: { attachment: CommentUserAction['payload']['comment'] };
    };
  };
  connector: {
    parameters: {
      payload: {
        connector: ConnectorUserAction['payload']['connector'];
      };
    };
  };
  create_case: {
    parameters: {
      payload: CasePostRequest;
    };
  };
  delete_case: {
    parameters: { payload: {} };
  };
}

export interface CreateUserAction<T extends keyof BuilderParameters> {
  type: T;
  payload: BuilderParameters[T]['parameters']['payload'];
}

export type UserActionParameters<T extends keyof BuilderParameters> =
  BuilderParameters[T]['parameters'] & CommonArguments;

export interface CommonArguments {
  user: User;
  caseId: string;
  owner: string;
  attachmentId?: string;
  connectorId?: string;
  action?: UserAction;
}

export interface Attributes {
  action: UserAction;
  created_at: string;
  created_by: User;
  owner: string;
  type: UserActionTypes;
  payload: Record<string, unknown>;
}

export interface BuilderReturnValue {
  attributes: Attributes;
  references: SavedObjectReference[];
}

export type CommonBuilderArguments = CommonArguments & {
  action: UserAction;
  type: UserActionTypes;
  value: unknown;
  valueKey: string;
};
