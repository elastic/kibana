/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEventType } from '@kbn/logging';
import type { ActionOperationValues } from '../../../common/api';
import type { LoggerCommonFields, PersistableUserActionFields, UserActionLogBody } from './types';

const actionsToEcsType: Record<ActionOperationValues, EcsEventType> = {
  // TODO: should this be an array of change and creation? or maybe just creation?
  add: 'change',
  delete: 'deletion',
  create: 'creation',
  push_to_service: 'creation',
  update: 'change',
};

export class ConstructedUserAction {
  private readonly commonFields: LoggerCommonFields;
  private readonly logBody: UserActionLogBody;
  private readonly _persistableUserAction: PersistableUserActionFields;

  constructor({
    commonFields,
    logBody,
    persistableUserAction,
  }: {
    commonFields: LoggerCommonFields;
    logBody: UserActionLogBody;
    persistableUserAction: PersistableUserActionFields;
  }) {
    this.commonFields = commonFields;
    this.logBody = logBody;
    this._persistableUserAction = persistableUserAction;
  }

  public get persistableUserAction() {
    return this._persistableUserAction;
  }

  public log(storedUserActionId: string) {
    this.commonFields.auditLogger?.log({
      message: this.logBody.createMessage(storedUserActionId),
      event: {
        action: this.logBody.eventAction,
        category: ['database'],
        type: [actionsToEcsType[this._persistableUserAction.attributes.action]],
      },
      kibana: {
        saved_object: {
          type: this.logBody.entityType,
          id: this.logBody.entityId,
        },
      },
    });
  }
}
