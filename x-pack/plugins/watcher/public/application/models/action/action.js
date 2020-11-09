/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import { get } from 'lodash';
import { ACTION_TYPES } from '../../../../common/constants';
import { EmailAction } from './email_action';
import { LoggingAction } from './logging_action';
import { SlackAction } from './slack_action';
import { WebhookAction } from './webhook_action';
import { IndexAction } from './index_action';
import { PagerDutyAction } from './pagerduty_action';
import { JiraAction } from './jira_action';
import { UnknownAction } from './unknown_action';

const ActionTypes = {};
set(ActionTypes, ACTION_TYPES.EMAIL, EmailAction);
set(ActionTypes, ACTION_TYPES.LOGGING, LoggingAction);
set(ActionTypes, ACTION_TYPES.SLACK, SlackAction);
set(ActionTypes, ACTION_TYPES.WEBHOOK, WebhookAction);
set(ActionTypes, ACTION_TYPES.INDEX, IndexAction);
set(ActionTypes, ACTION_TYPES.PAGERDUTY, PagerDutyAction);
set(ActionTypes, ACTION_TYPES.JIRA, JiraAction);

export class Action {
  static getActionTypes = () => {
    return ActionTypes;
  };

  static fromUpstreamJson(upstreamAction) {
    const type = get(upstreamAction, 'type');
    const ActionType = ActionTypes[type] || UnknownAction;

    return ActionType.fromUpstreamJson(upstreamAction);
  }
}
