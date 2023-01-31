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
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';
import { getPastTenseVerb } from './audit_logger_utils';

export class TagsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'tags'>): UserActionEvent {
    const action = args.action ?? Actions.add;

    const parameters = this.buildCommonUserAction({
      ...args,
      action: args.action ?? Actions.add,
      valueKey: 'tags',
      value: args.payload.tags,
      type: ActionTypes.tags,
    });

    const verb = getPastTenseVerb(action);
    const preposition = getPreposition(action);

    const getMessage = (id?: string) =>
      `User ${verb} tags ${preposition} case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: `case_user_action_${action}_case_tags`,
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
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
