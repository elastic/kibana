/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseAction } from './base_action';
import { ACTION_TYPES, ERROR_CODES } from '../../../common/constants';
import { i18n } from '@kbn/i18n';

export class IndexAction extends BaseAction {
  constructor(props, errors) {
    props.type = ACTION_TYPES.INDEX;
    super(props, errors);

    this.index = props.index;
  }

  // To Kibana
  get downstreamJson() {
    const result = super.downstreamJson;
    Object.assign(result, {
      index: this.index
    });

    return result;
  }

  // From Kibana
  static fromDownstreamJson(json) {
    const props = super.getPropsFromDownstreamJson(json);
    const { errors } = this.validateJson(json);

    Object.assign(props, {
      index: json.index
    });

    const action = new IndexAction(props, errors);
    return { action, errors };
  }

  // To Elasticsearch
  get upstreamJson() {
    const result = super.upstreamJson;

    result[this.id] = {
      index: this.index,
    };
    return result;
  }

  // From Elasticsearch
  static fromUpstreamJson(json) {
    const props = super.getPropsFromUpstreamJson(json);
    const { errors } = this.validateJson(json.actionJson);

    Object.assign(props, {
      index: json.actionJson.index.index
    });

    const action = new IndexAction(props, errors);
    return { action, errors };
  }

  static validateJson(json) {
    const errors = [];

    if (!json.index) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate('xpack.watcher.models.indexAction.actionJsonIndexPropertyMissingBadRequestMessage', {
          defaultMessage: 'JSON argument must contain an {actionJsonIndex} property',
          values: {
            actionJsonIndex: 'actionJson.index'
          }
        }),
      });

      json.index = {};
    }

    if (!json.index.index) {
      errors.push({
        code: ERROR_CODES.ERR_PROP_MISSING,
        message: i18n.translate('xpack.watcher.models.loggingAction.actionJsonIndexNamePropertyMissingBadRequestMessage', {
          defaultMessage: 'JSON argument must contain an {actionJsonIndexName} property',
          values: {
            actionJsonIndexName: 'actionJson.index.index'
          }
        }),
      });
    }

    return { errors: errors.length ? errors : null };
  }

}
