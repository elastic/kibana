/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { BaseAction } from './base_action';
import { ACTION_TYPES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class SlackAction extends BaseAction {
  constructor(props) {
    props.type = ACTION_TYPES.SLACK;
    super(props);

    this.to = props.to;
    this.text = props.text;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      to: this.to,
      text: this.text
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);

    Object.assign(props, {
      to: json.to,
      text: json.text
    });

    return new SlackAction(props);
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = {
      slack: {
        message: {
          to: this.to,
          text: this.text
        }
      }
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);

    if (!json.actionJson.slack) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.slackAction.absenceOfActionJsonSlackPropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonSlack} property',
          values: {
            actionJsonSlack: 'actionJson.slack'
          }
        }),
      );
    }
    if (!json.actionJson.slack.message) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.slackAction.absenceOfActionJsonSlackMessagePropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonSlackMessage} property',
          values: {
            actionJsonSlackMessage: 'actionJson.slack.message'
          }

        }),
      );
    }
    if (!json.actionJson.slack.message.to) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.slackAction.absenceOfActionJsonSlackMessageToPropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonSlackMessageTo} property',
          values: {
            actionJsonSlackMessageTo: 'actionJson.slack.message.to'
          }
        }),
      );
    }

    Object.assign(props, {
      to: json.actionJson.slack.message.to,
      text: json.actionJson.slack.message.text
    });

    return new SlackAction(props);
  }

  /*
  json.actionJson should have the following structure:
  {
    "slack" : {
      "message" : {
        "to" : "#channel_name, @user"
        "text" : "executed at {{ctx.execution_time}}",
      }
    }
  }
  */
}
