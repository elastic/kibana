/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['message'];
const optionalFields = ['account', 'proxy'];

const allFields = [...requiredFields, ...optionalFields];

export class HipchatAction extends BaseAction {
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
    return i18n.translate('xpack.watcher.models.hipchatAction.description', {
      defaultMessage: '{body} will be sent through Hipchat',
      values: {
        body: this.fields.message && this.fields.message.body || ''
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.hipchatAction.simulateMessage', {
      defaultMessage: 'Hipchat message has been sent.',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.hipchatAction.simulateFailMessage', {
      defaultMessage: 'Failed to send Hipchat message.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new HipchatAction(upstreamAction);
  }
}
