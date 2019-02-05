/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['fields'];
const optionalFields = ['account', 'proxy'];

const allFields = [...requiredFields, ...optionalFields];

export class JiraAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    allFields.forEach((field) => {
      this[field] = get(props, field);
    });
  }

  get upstreamJson() {
    // Add all required fields to the request body
    let result = requiredFields.reduce((acc, field) => {
      acc[field] = this[field];
      return acc;
    }, super.upstreamJson);

    // If optional fields have been set, add them to the body
    result = optionalFields.reduce((acc, field) => {
      if (this[field]) {
        acc[field] = this[field];
      }
      return acc;
    }, result);

    return result;
  }

  get description() {
    return i18n.translate('xpack.watcher.models.jiraAction.description', {
      defaultMessage: '{issueName} will be created in Jira',
      values: {
        issueName: this.fields && this.fields.issuetype && this.fields.issuetype.name || ''
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.jiraAction.simulateMessage', {
      defaultMessage: 'Jira issue has been created.',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.jiraAction.simulateFailMessage', {
      defaultMessage: 'Failed to create Jira issue.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new JiraAction(upstreamAction);
  }
}

