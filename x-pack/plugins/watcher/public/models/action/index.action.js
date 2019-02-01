/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['index', 'doc_type'];
const optionalFields = [
  'doc_id',
  'execution_time_field',
  'timeout',
  'refresh'
];

const allFields = [...requiredFields, ...optionalFields];

export class IndexAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    allFields.forEach((field) => {
      this[field] = get(props, field);
    });

    this.fullPath = this.url ? this.url : this.host + this.port + this.path;
  }

  get upstreamJson() {
    // Add all required fields to the request body
    let result = requiredFields.reduce((acc, field) => {
      acc[field] = this[field];
      return acc;
    }, super.upstreamJson);

    // If optional fields have been set, send them as well
    result = optionalFields.reduce((acc, field) => {
      if (this[field]) {
        acc[field] = this[field];
      }
      return acc;
    }, result);

    return result;
  }

  get description() {
    return i18n.translate('xpack.watcher.models.indexAction.description', {
      defaultMessage: 'Webhook will trigger a {method} request on {fullPath}',
      values: {
        method: this.method,
        fullPath: this.fullPath
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.indexAction.simulateMessage', {
      defaultMessage: 'Sample request sent to {fullPath}',
      values: {
        fullPath: this.fullPath
      }
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.indexAction.simulateFailMessage', {
      defaultMessage: 'Failed to send request to {fullPath}.',
      values: {
        fullPath: this.fullPath
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new IndexAction(upstreamAction);
  }
}
