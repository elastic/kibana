/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';
import { badRequest } from 'boom';
import { getActionType } from '../../../common/lib/get_action_type';
import { ACTION_TYPES } from '../../../common/constants';
import { LoggingAction } from './logging_action';
import { EmailAction } from './email_action';
import { SlackAction } from './slack_action';
import { UnknownAction } from './unknown_action';
import { i18n } from '@kbn/i18n';

const ActionTypes = {};
set(ActionTypes, ACTION_TYPES.LOGGING, LoggingAction);
set(ActionTypes, ACTION_TYPES.EMAIL, EmailAction);
set(ActionTypes, ACTION_TYPES.SLACK, SlackAction);
set(ActionTypes, ACTION_TYPES.UNKNOWN, UnknownAction);

export class Action {
  static getActionTypes = () => {
    return ActionTypes;
  }

  // From Elasticsearch
  static fromUpstreamJson(json, options = { throwExceptions: {} }) {
    if (!json.id) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.actionStatus.absenceOfIdPropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {id} property',
          values: {
            id: 'id'
          }
        }),
      );
    }

    if (!json.actionJson) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.action.absenceOfActionJsonPropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJson} property',
          values: {
            actionJson: 'actionJson'
          }
        }),
      );
    }

    const type = getActionType(json.actionJson);
    const ActionType = ActionTypes[type] || UnknownAction;

    const { action, errors } = ActionType.fromUpstreamJson(json, options);
    const doThrowException = options.throwExceptions.Action !== false;

    if (errors && doThrowException) {
      this.throwErrors(errors);
    }

    return action;
  }

  // From Kibana
  static fromDownstreamJson(json, options = { throwExceptions: {} }) {
    const ActionType = ActionTypes[json.type] || UnknownAction;

    const { action, errors } = ActionType.fromDownstreamJson(json);
    const doThrowException = options.throwExceptions.Action !== false;

    if (errors && doThrowException) {
      this.throwErrors(errors);
    }

    return action;
  }

  static throwErrors(errors) {
    const allMessages = errors.reduce((message, error) => {
      if (message) {
        return `${message}, ${error.message}`;
      }
      return error.message;
    }, '');
    throw badRequest(allMessages);
  }
}
