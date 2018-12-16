/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class LoggingAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.LOGGING;
    super(props, errors);

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
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      text: json.text
    });

    const action = new LoggingAction(props, errors);
    return { action, errors };
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
    const { errors } = this.validateJson(json.actionJson);

    Object.assign(props, {
      text: json.actionJson.logging.text
    });

    const action = new LoggingAction(props, errors);
    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.logging) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate('xpack.watcher.models.loggingAction.actionJsonLoggingPropertyMissingBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonLogging} property',
          values: {
            actionJsonLogging: 'actionJson.logging'
          }
        }),
      });

      json.logging = {};
    }

    if (!json.logging.text) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate('xpack.watcher.models.loggingAction.actionJsonLoggingTextPropertyMissingBadRequestMessage', {
          defaultMessage: 'json argument must contain an {actionJsonLoggingText} property',
          values: {
            actionJsonLoggingText: 'actionJson.logging.text'
          }
        }),
      });
    }

    return { errors: errors.length ? errors : null };
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
