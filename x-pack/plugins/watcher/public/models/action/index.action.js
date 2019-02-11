/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['host', 'port'];
const optionalFields = [
  'scheme',
  'path',
  'method',
  'headers',
  'params',
  'auth',
  'body',
  'proxy',
  'connection_timeout',
  'read_timeout',
  'url'
];

const allFields = [...requiredFields, ...optionalFields];

export class IndexAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    this.fields = {};
    allFields.forEach((field) => {
      this.fields[field] = get(props, field);
    });
  }

  get upstreamJson() {
    // Add all required fields to the request body
    let result = requiredFields.reduce((acc, field) => {
      acc[field] = this.fields[field];
      return acc;
    }, super.upstreamJson);

    // If optional fields have been set, add them to the body
    result = optionalFields.reduce((acc, field) => {
      if (this[field]) {
        acc[field] = this.fields[field];
      }
      return acc;
    }, result);

    return result;
  }

  get description() {
    return i18n.translate('xpack.watcher.models.indexAction.description', {
      defaultMessage: 'The {index} will be indexed as {docType}',
      values: {
        index: this.fields.index,
        docType: this.fields.doc_type,
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.indexAction.simulateMessage', {
      defaultMessage: 'Index {index} has been indexed.',
      values: {
        index: this.index,
      }
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.indexAction.simulateFailMessage', {
      defaultMessage: 'Failed to index {index}.',
      values: {
        index: this.index
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new IndexAction(upstreamAction);
  }
}
