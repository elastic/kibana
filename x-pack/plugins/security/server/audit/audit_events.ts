/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'src/core/server';
import { AuthenticationResult } from '../authentication/authentication_result';

/**
 * Audit event schema using ECS format.
 * https://www.elastic.co/guide/en/ecs/1.5/index.html
 * @public
 */
export interface AuditEvent {
  /**
   * Human readable message describing action, outcome and user.
   *
   * @example
   * User [jdoe] logged in using basic provider [name=basic1]
   */
  message: string;
  event: {
    action: string;
    category?: EventCategory;
    type?: EventType;
    outcome?: EventOutcome;
    module?: string;
    dataset?: string;
  };
  user?: {
    name: string;
    email?: string;
    full_name?: string;
    hash?: string;
    roles?: readonly string[];
  };
  kibana?: {
    /**
     * Current space id of the request.
     */
    space_id?: string;
    /**
     * Saved object that was created, changed, deleted or accessed as part of the action.
     */
    saved_object?: {
      type: string;
      id: string;
    };
    /**
     * Any additional event specific fields.
     */
    [x: string]: any;
  };
  error?: {
    code?: string;
    message?: string;
  };
  http?: {
    request?: {
      method?: string;
      body?: {
        content: string;
      };
    };
    response?: {
      status_code?: number;
    };
  };
  url?: {
    domain?: string;
    full?: string;
    path?: string;
    port?: number;
    query?: string;
    scheme?: string;
  };
}

export enum EventCategory {
  DATABASE = 'database',
  WEB = 'web',
  IAM = 'iam',
  AUTHENTICATION = 'authentication',
  PROCESS = 'process',
}

export enum EventType {
  USER = 'user',
  GROUP = 'group',
  CREATION = 'creation',
  ACCESS = 'access',
  CHANGE = 'change',
  DELETION = 'deletion',
}

export enum EventOutcome {
  SUCCESS = 'success',
  FAILURE = 'failure',
  UNKNOWN = 'unknown',
}

export interface HttpRequestParams {
  request: KibanaRequest;
}

export function httpRequestEvent({ request }: HttpRequestParams): AuditEvent {
  const url = request.rewrittenUrl ?? request.url;

  return {
    message: `User is requesting [${url.pathname}] endpoint`,
    event: {
      action: 'http_request',
      category: EventCategory.WEB,
      outcome: EventOutcome.UNKNOWN,
    },
    http: {
      request: {
        method: request.route.method,
      },
    },
    url: {
      domain: url.hostname,
      path: url.pathname,
      port: url.port ? parseInt(url.port, 10) : undefined,
      query: url.search ? url.search.slice(1) : undefined,
      scheme: url.protocol,
    },
  };
}

export interface UserLoginParams {
  authenticationResult: AuthenticationResult;
  authenticationProvider?: string;
  authenticationType?: string;
}

export function userLoginEvent({
  authenticationResult,
  authenticationProvider,
  authenticationType,
}: UserLoginParams): AuditEvent {
  return {
    message: authenticationResult.user
      ? `User [${authenticationResult.user.username}] has logged in using ${authenticationType} provider [name=${authenticationProvider}]`
      : `Failed attempt to login using ${authenticationType} provider [name=${authenticationProvider}]`,
    event: {
      action: 'user_login',
      category: EventCategory.AUTHENTICATION,
      outcome: authenticationResult.user ? EventOutcome.SUCCESS : EventOutcome.FAILURE,
    },
    user: authenticationResult.user && {
      name: authenticationResult.user.username,
      roles: authenticationResult.user.roles,
    },
    kibana: {
      space_id: undefined, // Ensure this does not get populated by audit service
      authentication_provider: authenticationProvider,
      authentication_type: authenticationType,
      authentication_realm: authenticationResult.user?.authentication_realm.name,
      lookup_realm: authenticationResult.user?.lookup_realm.name,
    },
    error: authenticationResult.error && {
      code: authenticationResult.error.name,
      message: authenticationResult.error.message,
    },
  };
}

export enum SavedObjectAction {
  CREATE = 'saved_object_create',
  GET = 'saved_object_get',
  UPDATE = 'saved_object_update',
  DELETE = 'saved_object_delete',
  FIND = 'saved_object_find',
  ADD_TO_SPACES = 'saved_object_add_to_spaces',
  DELETE_FROM_SPACES = 'saved_object_delete_from_spaces',
  REMOVE_REFERENCES = 'saved_object_remove_references',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<SavedObjectAction, VerbsTuple> = {
  saved_object_create: ['create', 'creating', 'created'],
  saved_object_get: ['access', 'accessing', 'accessed'],
  saved_object_update: ['update', 'updating', 'updated'],
  saved_object_delete: ['delete', 'deleting', 'deleted'],
  saved_object_find: ['access', 'accessing', 'accessed'],
  saved_object_add_to_spaces: ['update', 'updating', 'updated'],
  saved_object_delete_from_spaces: ['update', 'updating', 'updated'],
  saved_object_remove_references: [
    'remove references to',
    'removing references to',
    'removed references to',
  ],
};

const eventTypes: Record<SavedObjectAction, EventType> = {
  saved_object_create: EventType.CREATION,
  saved_object_get: EventType.ACCESS,
  saved_object_update: EventType.CHANGE,
  saved_object_delete: EventType.DELETION,
  saved_object_find: EventType.ACCESS,
  saved_object_add_to_spaces: EventType.CHANGE,
  saved_object_delete_from_spaces: EventType.CHANGE,
  saved_object_remove_references: EventType.CHANGE,
};

export interface SavedObjectEventParams {
  action: SavedObjectAction;
  outcome?: EventOutcome;
  savedObject?: Required<Required<AuditEvent>['kibana']>['saved_object'];
  addToSpaces?: readonly string[];
  deleteFromSpaces?: readonly string[];
  error?: Error;
}

export function savedObjectEvent({
  action,
  savedObject,
  addToSpaces,
  deleteFromSpaces,
  outcome,
  error,
}: SavedObjectEventParams): AuditEvent | undefined {
  const doc = savedObject ? `${savedObject.type} [id=${savedObject.id}]` : 'saved objects';
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = eventTypes[action];

  if (
    type === EventType.ACCESS &&
    savedObject &&
    (savedObject.type === 'config' || savedObject.type === 'telemetry')
  ) {
    return;
  }

  return {
    message,
    event: {
      action,
      category: EventCategory.DATABASE,
      type,
      outcome: outcome ?? (error ? EventOutcome.FAILURE : EventOutcome.SUCCESS),
    },
    kibana: {
      saved_object: savedObject,
      add_to_spaces: addToSpaces,
      delete_from_spaces: deleteFromSpaces,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
