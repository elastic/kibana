/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isArray } from 'lodash';
import { BaseAction } from './base_action';

export class SlackAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    const toArray = get(props, 'to', []);
    this.to = isArray(toArray) ? toArray : [ toArray ];
    this.text = props.text;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      to: this.to,
      text: this.text
    });

    return result;
  }

  get description() {
    const toList = this.to.join(', ');
    return `Slack message will be sent to ${toList}`;
  }

  get simulateMessage() {
    const toList = this.to.join(', ');
    return `Sample Slack message sent to ${toList}.`;
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return `Failed to send sample Slack message to ${toList}.`;
  }

  static fromUpstreamJson(upstreamAction) {
    return new SlackAction(upstreamAction);
  }

  static typeName = 'Slack';
  static iconClass = 'kuiIcon fa-slack';
  static template = '<watch-slack-action></watch-slack-action>';
  static selectMessage = 'Send a message to a slack user or channel.';
  static simulatePrompt = 'Send a sample message now';
}
