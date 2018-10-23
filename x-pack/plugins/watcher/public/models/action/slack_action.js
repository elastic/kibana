/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isArray } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

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
    return i18n.translate('xpack.watcher.models.slackAction.description', {
      defaultMessage: 'Slack message will be sent to {toList}',
      values: {
        toList
      }
    });
  }

  get simulateMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.simulateMessage', {
      defaultMessage: 'Sample Slack message sent to {toList}.',
      values: {
        toList
      }
    });
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.simulateFailMessage', {
      defaultMessage: 'Failed to send sample Slack message to {toList}.',
      values: {
        toList
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new SlackAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.slackAction.TypeName', {
    defaultMessage: 'Slack'
  });
  static iconClass = 'kuiIcon fa-slack';
  static template = '<watch-slack-action></watch-slack-action>';
  static selectMessage = i18n.translate('xpack.watcher.models.slackAction.selectMessageText', {
    defaultMessage: 'Send a message to a slack user or channel.'
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.slackAction.simulateButtonLabel', {
    defaultMessage: 'Send a sample message now'
  });
}
