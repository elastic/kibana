/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { badRequest } from 'boom';
import { i18n } from '@kbn/i18n';

export class BaseAction {
  constructor(props, errors) {
    this.id = props.id;
    this.type = props.type;
    this.errors = errors;
  }

  get downstreamJson() {
    const result = {
      id: this.id,
      type: this.type
    };

    return result;
  }

  get upstreamJson() {
    const result = {};
    return result;
  }

  static getPropsFromDownstreamJson(json) {
    return {
      id: json.id
    };
  }

  static getPropsFromUpstreamJson(json) {
    if (!json.id) {
      throw badRequest(
        i18n.translate('xpack.watcher.models.baseAction.idPropertyMissingBadRequestMessage', {
          defaultMessage: 'json argument must contain an {id} property',
          values: {
            id: 'id'
          }
        }),
      );
    }

    return {
      id: json.id
    };
  }
}
