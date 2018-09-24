/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';

export class LoggingAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    this.text = get(props, 'text', '');
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      text: this.text
    });

    return result;
  }

  get description() {
    const text = this.text || '';
    return `Log message '${text}'`;
  }

  get simulateMessage() {
    return `Sample message logged`;
  }

  get simulateFailMessage() {
    return `Failed to log sample message.`;
  }

  static fromUpstreamJson(upstreamAction) {
    return new LoggingAction(upstreamAction);
  }

  static typeName = 'Logging';
  static iconClass = 'kuiIcon fa-file-text-o';
  static selectMessage = 'Add a new item to the logs.';
  static template = '<watch-logging-action></watch-logging-action>';
  static selectMessage = 'Add a new item to the logs.';
  static simulatePrompt = 'Log a sample message now';
}
