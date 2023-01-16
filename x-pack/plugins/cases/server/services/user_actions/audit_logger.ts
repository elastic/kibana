/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEventType } from '@kbn/ecs';
import type { AuditLogger } from '@kbn/security-plugin/server';
import type { UserAction as Action } from '../../../common/api';
import type { EventDetails } from './types';

const actionsToEcsType: Record<Action, EcsEventType> = {
  add: 'change',
  delete: 'deletion',
  create: 'creation',
  push_to_service: 'change',
  update: 'change',
};

export class UserActionAuditLogger {
  constructor(private readonly auditLogger: AuditLogger) {}

  public log(event?: EventDetails, storedUserActionId?: string) {
    if (!event) {
      return;
    }

    this.auditLogger.log({
      message: event.getMessage(storedUserActionId),
      event: {
        action: event.descriptiveAction,
        category: ['database'],
        type: [actionsToEcsType[event.action]],
        outcome: 'success',
      },
      kibana: {
        saved_object: {
          type: event.savedObjectType,
          id: event.savedObjectId,
        },
      },
    });
  }
}
