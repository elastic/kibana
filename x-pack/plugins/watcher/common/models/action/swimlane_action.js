/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../constants';
import { i18n } from '@kbn/i18n';

export class SwimlaneAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.SWIMLANE;
    super(props, errors);

    this.description = props.description;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      description: this.description,
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      description: json.description,
    });

    const action = new SwimlaneAction(props, errors);
    return { action, errors };
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = {
      swimlane: {
        description: this.description,
      },
    };

    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);
    const { errors } = this.validateJson(json.actionJson);

    Object.assign(props, {
      description: json.actionJson.swimlane.description,
    });

    const action = new SwimlaneAction(props, errors);
    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.swimlane) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.swimlaneAction.actionJsonSwimlaneropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonSwimlane} property',
            values: {
              actionJsonSwimlane: 'actionJson.swimlane',
            },
          }
        ),
      });
    }

    if (json.swimlane && !json.swimlane.description) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate(
          'xpack.watcher.models.swimlaneAction.actionJsonSwimlaneDescriptionPropertyMissingBadRequestMessage',
          {
            defaultMessage: 'JSON argument must contain an {actionJsonSwimlaneText} property',
            values: {
              actionJsonSwimlaneText: 'actionJson.swimlane.description',
            },
          }
        ),
      });
    }

    return { errors: errors.length ? errors : null };
  }
}
