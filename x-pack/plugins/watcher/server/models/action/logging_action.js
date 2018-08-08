/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { BaseAction } from './base_action';
import { ACTION_TYPES } from '../../../common/constants';

export class LoggingAction extends BaseAction {
  constructor(props) {
    props.type = ACTION_TYPES.LOGGING;
    super(props);

    this.text = props.text;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      text: this.text
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);

    Object.assign(props, {
      text: json.text
    });

    return new LoggingAction(props);
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = {
      logging: {
        text: this.text
      }
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);

    if (!json.actionJson.logging) {
      throw badRequest('json argument must contain an actionJson.logging property');
    }
    if (!json.actionJson.logging.text) {
      throw badRequest('json argument must contain an actionJson.logging.text property');
    }

    Object.assign(props, {
      text: json.actionJson.logging.text
    });

    return new LoggingAction(props);
  }

  /*
  json.actionJson should have the following structure:
  {
    "logging" : {
      "text" : "executed at {{ctx.execution_time}}",
      ["category" : "xpack.watcher.actions.logging",]
      ["level" : "info"]
    }
  }
  */
}
