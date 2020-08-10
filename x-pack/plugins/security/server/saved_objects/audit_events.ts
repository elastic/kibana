/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditEvent, AuditEventDecorator } from 'src/core/server';

export enum SavedObjectAction {
  CREATE = 'saved_object_create',
  GET = 'saved_object_get',
  UPDATE = 'saved_object_update',
  DELETE = 'saved_object_delete',
  FIND = 'saved_object_find',
  ADD_TO_SPACES = 'saved_object_add_to_spaces',
  DELETE_FROM_SPACES = 'saved_object_delete_from_spaces',
}

export interface SavedObjectEventArgs
  extends Pick<AuditEvent['kibana'], 'saved_object' | 'add_to_spaces' | 'delete_from_spaces'> {
  action: SavedObjectAction;
  outcome?: AuditEvent['event']['outcome'];
  error?: Error;
}

const verbs = {
  saved_object_create: ['create', 'creating', 'created'],
  saved_object_get: ['access', 'accessing', 'accessed'],
  saved_object_update: ['update', 'updating', 'updated'],
  saved_object_delete: ['delete', 'deleting', 'deleted'],
  saved_object_find: ['access', 'accessing', 'accessed'],
  saved_object_add_to_spaces: ['update', 'updating', 'updated'],
  saved_object_delete_from_spaces: ['update', 'updating', 'updated'],
};

const types = {
  saved_object_create: 'creation',
  saved_object_get: 'access',
  saved_object_update: 'change',
  saved_object_delete: 'deletion',
  saved_object_find: 'access',
  saved_object_add_to_spaces: 'change',
  saved_object_delete_from_spaces: 'change',
};

export const savedObjectEvent: AuditEventDecorator<SavedObjectEventArgs> = (
  event,
  { action, saved_object, add_to_spaces, delete_from_spaces, outcome, error } // eslint-disable-line @typescript-eslint/naming-convention
) => {
  const doc = saved_object ? `${saved_object.type} [id=${saved_object.id}]` : 'saved objects';
  const present = verbs[action][0];
  const progressive = verbs[action][1];
  const past = verbs[action][2];
  const message = error
    ? `Failed attempt to ${present} ${doc} by user [${event.user?.name}]`
    : outcome === 'unknown'
    ? `User [${event.user?.name}] is ${progressive} ${doc}`
    : `User [${event.user?.name}] ${past} ${doc}`;
  const type = types[action] as AuditEvent['event']['type'];

  return {
    ...event,
    message,
    event: {
      action,
      category: 'database',
      type,
      outcome: outcome ?? (error ? 'failure' : 'success'),
    },
    kibana: {
      ...event.kibana,
      saved_object,
      add_to_spaces,
      delete_from_spaces,
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
};
