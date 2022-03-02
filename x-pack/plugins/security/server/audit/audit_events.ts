/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEventOutcome, EcsEventType, KibanaRequest, LogMeta } from 'src/core/server';

import type { AuthenticationProvider } from '../../common/model';
import type { AuthenticationResult } from '../authentication/authentication_result';

/**
 * Audit event schema using ECS format: https://www.elastic.co/guide/en/ecs/1.12/index.html
 *
 * If you add additional fields to the schema ensure you update the Kibana Filebeat module:
 * https://github.com/elastic/beats/tree/master/filebeat/module/kibana
 *
 * @public
 */
export interface AuditEvent extends LogMeta {
  message: string;
  kibana?: {
    /**
     * The ID of the space associated with this event.
     */
    space_id?: string;
    /**
     * The ID of the user session associated with this event. Each login attempt
     * results in a unique session id.
     */
    session_id?: string;
    /**
     * Saved object that was created, changed, deleted or accessed as part of this event.
     */
    saved_object?: {
      type: string;
      id: string;
    };
    /**
     * Name of authentication provider associated with a login event.
     */
    authentication_provider?: string;
    /**
     * Type of authentication provider associated with a login event.
     */
    authentication_type?: string;
    /**
     * Name of Elasticsearch realm that has authenticated the user.
     */
    authentication_realm?: string;
    /**
     * Name of Elasticsearch realm where the user details were retrieved from.
     */
    lookup_realm?: string;
    /**
     * Set of space IDs that a saved object was shared to.
     */
    add_to_spaces?: readonly string[];
    /**
     * Set of space IDs that a saved object was removed from.
     */
    delete_from_spaces?: readonly string[];
  };
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
      category: ['web'],
      outcome: 'unknown',
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
      scheme: url.protocol ? url.protocol.substr(0, url.protocol.length - 1) : undefined,
    },
  };
}

export interface UserLoginParams {
  authenticationResult: AuthenticationResult;
  authenticationProvider?: string;
  authenticationType?: string;
  sessionId?: string;
}

export function userLoginEvent({
  authenticationResult,
  authenticationProvider,
  authenticationType,
  sessionId,
}: UserLoginParams): AuditEvent {
  return {
    message: authenticationResult.user
      ? `User [${authenticationResult.user.username}] has logged in using ${authenticationType} provider [name=${authenticationProvider}]`
      : `Failed attempt to login using ${authenticationType} provider [name=${authenticationProvider}]`,
    event: {
      action: 'user_login',
      category: ['authentication'],
      outcome: authenticationResult.user ? 'success' : 'failure',
    },
    user: authenticationResult.user && {
      name: authenticationResult.user.username,
      roles: authenticationResult.user.roles as string[],
    },
    kibana: {
      space_id: undefined, // Ensure this does not get populated by audit service
      session_id: sessionId,
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

export interface UserLogoutParams {
  username?: string;
  provider: AuthenticationProvider;
}

export function userLogoutEvent({ username, provider }: UserLogoutParams): AuditEvent {
  return {
    message: `User [${username}] is logging out using ${provider.type} provider [name=${provider.name}]`,
    event: {
      action: 'user_logout',
      category: ['authentication'],
      outcome: 'unknown',
    },
    user: username
      ? {
          name: username,
        }
      : undefined,
    kibana: {
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export interface SessionCleanupParams {
  sessionId: string;
  usernameHash?: string;
  provider: AuthenticationProvider;
}

export function sessionCleanupEvent({
  usernameHash,
  sessionId,
  provider,
}: SessionCleanupParams): AuditEvent {
  return {
    message: `Removing invalid or expired session for user [hash=${usernameHash}]`,
    event: {
      action: 'session_cleanup',
      category: ['authentication'],
      outcome: 'unknown',
    },
    user: {
      hash: usernameHash,
    },
    kibana: {
      session_id: sessionId,
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export interface AccessAgreementAcknowledgedParams {
  username: string;
  provider: AuthenticationProvider;
}

export function accessAgreementAcknowledgedEvent({
  username,
  provider,
}: AccessAgreementAcknowledgedParams): AuditEvent {
  return {
    message: `${username} acknowledged access agreement using ${provider.type} provider [name=${provider.name}].`,
    event: {
      action: 'access_agreement_acknowledged',
      category: ['authentication'],
    },
    user: {
      name: username,
    },
    kibana: {
      space_id: undefined, // Ensure this does not get populated by audit service
      authentication_provider: provider.name,
      authentication_type: provider.type,
    },
  };
}

export enum SavedObjectAction {
  CREATE = 'saved_object_create',
  GET = 'saved_object_get',
  RESOLVE = 'saved_object_resolve',
  UPDATE = 'saved_object_update',
  DELETE = 'saved_object_delete',
  FIND = 'saved_object_find',
  REMOVE_REFERENCES = 'saved_object_remove_references',
  OPEN_POINT_IN_TIME = 'saved_object_open_point_in_time',
  CLOSE_POINT_IN_TIME = 'saved_object_close_point_in_time',
  COLLECT_MULTINAMESPACE_REFERENCES = 'saved_object_collect_multinamespace_references', // this is separate from 'saved_object_get' because the user is only accessing an object's metadata
  UPDATE_OBJECTS_SPACES = 'saved_object_update_objects_spaces', // this is separate from 'saved_object_update' because the user is only updating an object's metadata
}

type VerbsTuple = [string, string, string];

const savedObjectAuditVerbs: Record<SavedObjectAction, VerbsTuple> = {
  saved_object_create: ['create', 'creating', 'created'],
  saved_object_get: ['access', 'accessing', 'accessed'],
  saved_object_resolve: ['resolve', 'resolving', 'resolved'],
  saved_object_update: ['update', 'updating', 'updated'],
  saved_object_delete: ['delete', 'deleting', 'deleted'],
  saved_object_find: ['access', 'accessing', 'accessed'],
  saved_object_open_point_in_time: [
    'open point-in-time',
    'opening point-in-time',
    'opened point-in-time',
  ],
  saved_object_close_point_in_time: [
    'close point-in-time',
    'closing point-in-time',
    'closed point-in-time',
  ],
  saved_object_remove_references: [
    'remove references to',
    'removing references to',
    'removed references to',
  ],
  saved_object_collect_multinamespace_references: [
    'collect references and spaces of',
    'collecting references and spaces of',
    'collected references and spaces of',
  ],
  saved_object_update_objects_spaces: [
    'update spaces of',
    'updating spaces of',
    'updated spaces of',
  ],
};

const savedObjectAuditTypes: Record<SavedObjectAction, EcsEventType> = {
  saved_object_create: 'creation',
  saved_object_get: 'access',
  saved_object_resolve: 'access',
  saved_object_update: 'change',
  saved_object_delete: 'deletion',
  saved_object_find: 'access',
  saved_object_open_point_in_time: 'creation',
  saved_object_close_point_in_time: 'deletion',
  saved_object_remove_references: 'change',
  saved_object_collect_multinamespace_references: 'access',
  saved_object_update_objects_spaces: 'change',
};

export interface SavedObjectEventParams {
  action: SavedObjectAction;
  outcome?: EcsEventOutcome;
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
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
  const [present, progressive, past] = savedObjectAuditVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = savedObjectAuditTypes[action];

  if (
    type === 'access' &&
    savedObject &&
    (savedObject.type === 'config' || savedObject.type === 'telemetry')
  ) {
    return;
  }

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [type],
      outcome: outcome ?? (error ? 'failure' : 'success'),
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

export enum SpaceAuditAction {
  CREATE = 'space_create',
  GET = 'space_get',
  UPDATE = 'space_update',
  DELETE = 'space_delete',
  FIND = 'space_find',
}

const spaceAuditVerbs: Record<SpaceAuditAction, VerbsTuple> = {
  space_create: ['create', 'creating', 'created'],
  space_get: ['access', 'accessing', 'accessed'],
  space_update: ['update', 'updating', 'updated'],
  space_delete: ['delete', 'deleting', 'deleted'],
  space_find: ['access', 'accessing', 'accessed'],
};

const spaceAuditTypes: Record<SpaceAuditAction, EcsEventType> = {
  space_create: 'creation',
  space_get: 'access',
  space_update: 'change',
  space_delete: 'deletion',
  space_find: 'access',
};

export interface SpacesAuditEventParams {
  action: SpaceAuditAction;
  outcome?: EcsEventOutcome;
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function spaceAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: SpacesAuditEventParams): AuditEvent {
  const doc = savedObject ? `space [id=${savedObject.id}]` : 'spaces';
  const [present, progressive, past] = spaceAuditVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === 'unknown'
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = spaceAuditTypes[action];

  return {
    message,
    event: {
      action,
      category: ['database'],
      type: [type],
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      saved_object: savedObject,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
