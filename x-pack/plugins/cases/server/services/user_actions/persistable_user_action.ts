/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEventType } from '@kbn/logging';
import type { UserAction as Action } from '../../../common/api';
import type { LoggerCommonFields, PersistableUserActionFields, UserActionLogBody } from './types';

const actionsToEcsType: Record<Action, EcsEventType> = {
  add: 'change',
  delete: 'deletion',
  create: 'creation',
  push_to_service: 'creation',
  update: 'change',
};

export class PersistableUserAction {
  private readonly commonFields: LoggerCommonFields;
  private readonly logBody: UserActionLogBody;
  private readonly _persistableFields: PersistableUserActionFields;

  constructor({
    commonFields,
    logBody,
    _persistableFields,
  }: {
    commonFields: LoggerCommonFields;
    logBody: UserActionLogBody;
    _persistableFields: PersistableUserActionFields;
  }) {
    this.commonFields = commonFields;
    this.logBody = logBody;
    this._persistableFields = _persistableFields;
  }

  public get persistableFields() {
    return this._persistableFields;
  }

  public log(storedUserActionId?: string) {
    this.commonFields.auditLogger?.log({
      message: this.logBody.createMessage(storedUserActionId),
      event: {
        action: this.logBody.eventAction,
        category: ['database'],
        type: [actionsToEcsType[this._persistableFields.attributes.action]],
      },
      kibana: {
        saved_object: {
          type: this.logBody.savedObjectType,
          id: this.logBody.savedObjectId,
        },
      },
    });
  }
}
