/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class SlackAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.SLACK;
    super(props, errors);

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

    const { errors } = this.validateJson(json);

    Object.assign(props, {
      to: json.to,
      text: json.text
    });

    const action = new SlackAction(props, errors);
    return { action, errors };
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
    const { errors } = this.validateJson(json.actionJson);

    Object.assign(props, {
      to: json.actionJson.slack.message.to,
      text: json.actionJson.slack.message.text
    });

    const action = new SlackAction(props, errors);

    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.slack) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate('xpack.watcher.models.slackAction.absenceOfActionJsonSlackPropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonSlack} property',
          values: {
            actionJsonSlack: 'actionJson.slack'
          }
        })
      });

      json.slack = {};
    }

    if (!json.slack.message) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate('xpack.watcher.models.slackAction.absenceOfActionJsonSlackMessagePropertyBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonSlackMessage} property',
          values: {
            actionJsonSlackMessage: 'actionJson.slack.message'
          }
        }),
      });

      json.slack.message = {};
    }

    return { errors: errors.length ? errors : null };
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
