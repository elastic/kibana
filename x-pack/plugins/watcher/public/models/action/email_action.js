/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isArray } from 'lodash';
import { BaseAction } from './base_action';

export class EmailAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    const toArray = get(props, 'to', []);
    this.to = isArray(toArray) ? toArray : [ toArray ];
    this.subject = get(props, 'subject', '');
    this.body = get(props, 'body', '');
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      to: this.to,
      subject: this.subject,
      body: this.body
    });

    return result;
  }

  get description() {
    const toList = this.to.join(', ');
    const subject = this.subject || '';
    return `"${subject}" will be sent to ${toList}`;
  }

  get simulateMessage() {
    const toList = this.to.join(', ');
    return `Sample e-mail sent to ${toList}`;
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return `Failed to send e-mail to ${toList}.`;
  }

  static fromUpstreamJson(upstreamAction) {
    return new EmailAction(upstreamAction);
  }

  static typeName = 'E-mail';
  static iconClass = 'kuiIcon fa-envelope-o';
  static template = '<watch-email-action></watch-email-action>';
  static selectMessage = 'Send out an e-mail from your server.';
  static simulatePrompt = 'Test fire an e-mail now';
}
