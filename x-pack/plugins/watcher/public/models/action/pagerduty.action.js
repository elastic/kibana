/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['description', 'type'];
const optionalFields = [
  'event_type',
  'incident_key',
  'client',
  'client_url',
  'attach_payload',
  'contexts',
  'proxy',
  'href',
  'src',
];

const allFields = [...requiredFields, ...optionalFields];

export class PagerDutyAction extends BaseAction {
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
      if (this.fields[field]) {
        acc[field] = this.fields[field];
      }
      return acc;
    }, result);

    return result;
  }

  get description() {
    return i18n.translate('xpack.watcher.models.pagerDutyAction.description', {
      defaultMessage: '{description} will be sent to PagerDuty',
      values: {
        description: this.fields.description,
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.pagerDutyAction.simulateMessage', {
      defaultMessage: 'PagerDuty event has been sent.',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.pagerDutyAction.simulateFailMessage', {
      defaultMessage: 'Failed to send Hipchat event.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new PagerDutyAction(upstreamAction);
  }
}

