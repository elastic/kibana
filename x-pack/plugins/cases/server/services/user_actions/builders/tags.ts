/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { UserAction } from '../../../../common/api';
import { ActionTypes, Actions } from '../../../../common/api';
import { UserActionBuilder } from '../abstract_builder';
import type { PersistableUserAction } from '../persistable_user_action';
import type { UserActionLogBody, UserActionParameters } from '../types';
import { actionToPastTenseVerb } from './audit_logger_utils';

export class TagsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'tags'>): PersistableUserAction {
    const action = args.action ?? Actions.add;

    const fields = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.add,
      valueKey: 'tags',
      value: args.payload.tags,
      type: ActionTypes.tags,
    });

    const verb = actionToPastTenseVerb(action);
    const preposition = getPreposition(action);

    const createMessage = (id?: string) =>
      `User ${verb} tags ${preposition} case id: ${args.caseId} - user action id: ${id}`;

    const loggerFields: UserActionLogBody = {
      createMessage,
      eventAction: `case_user_action_${action}_case_tags`,
      entityId: args.caseId,
      entityType: CASE_SAVED_OBJECT,
    };

    return this.createPersistableUserAction(loggerFields, fields);
  }
}

const getPreposition = (action: UserAction): string => {
  switch (action) {
    case Actions.add:
      return 'to';
    case Actions.delete:
      return 'in';
    default:
      return 'for';
  }
};
