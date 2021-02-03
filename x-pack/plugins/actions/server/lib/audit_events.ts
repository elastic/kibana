/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditEvent, EventOutcome, EventCategory, EventType } from '../../../security/server';

export enum ConnectorAuditAction {
  CREATE = 'connector_create',
  GET = 'connector_get',
  UPDATE = 'connector_update',
  DELETE = 'connector_delete',
  FIND = 'connector_find',
  EXECUTE = 'connector_execute',
}

type VerbsTuple = [string, string, string];

const eventVerbs: Record<ConnectorAuditAction, VerbsTuple> = {
  connector_create: ['create', 'creating', 'created'],
  connector_get: ['access', 'accessing', 'accessed'],
  connector_update: ['update', 'updating', 'updated'],
  connector_delete: ['delete', 'deleting', 'deleted'],
  connector_find: ['access', 'accessing', 'accessed'],
  connector_execute: ['execute', 'executing', 'executed'],
};

const eventTypes: Record<ConnectorAuditAction, EventType | undefined> = {
  connector_create: EventType.CREATION,
  connector_get: EventType.ACCESS,
  connector_update: EventType.CHANGE,
  connector_delete: EventType.DELETION,
  connector_find: EventType.ACCESS,
  connector_execute: undefined,
};

export interface ConnectorAuditEventParams {
  action: ConnectorAuditAction;
  outcome?: EventOutcome;
  savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
  error?: Error;
}

export function connectorAuditEvent({
  action,
  savedObject,
  outcome,
  error,
}: ConnectorAuditEventParams): AuditEvent {
  const doc = savedObject ? `connector [id=${savedObject.id}]` : 'a connector';
  const [present, progressive, past] = eventVerbs[action];
  const message = error
    ? `Failed attempt to ${present} ${doc}`
    : outcome === EventOutcome.UNKNOWN
    ? `User is ${progressive} ${doc}`
    : `User has ${past} ${doc}`;
  const type = eventTypes[action];

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
    },
    error: error && {
      code: error.name,
      message: error.message,
    },
  };
}
