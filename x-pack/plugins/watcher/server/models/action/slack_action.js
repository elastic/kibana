/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { BaseAction } from './base_action';
import { ACTION_TYPES } from '../../../common/constants';

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
      throw badRequest('json argument must contain an actionJson.slack property');
    }
    if (!json.actionJson.slack.message) {
      throw badRequest('json argument must contain an actionJson.slack.message property');
    }
    if (!json.actionJson.slack.message.to) {
      throw badRequest('json argument must contain an actionJson.slack.message.to property');
    }
    if (!json.actionJson.slack.message.text) {
      throw badRequest('json argument must contain an actionJson.slack.message.text property');
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
