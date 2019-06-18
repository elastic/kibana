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

    const toArray = get(props, 'to');
    this.to = isArray(toArray) ? toArray : toArray && [ toArray ];

    const defaultText = i18n.translate('xpack.watcher.models.slackAction.defaultText', {
      defaultMessage: 'Watch [{context}] has exceeded the threshold',
      values: {
        context: '{{ctx.metadata.name}}',
      }
    });
    this.text = get(props, 'text', props.ignoreDefaults ? null : defaultText);
  }

  validate() {
    // Currently no validation required
    const errors = {
      to: [],
      text: [],
    };
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;
    const to = this.to && this.to.length > 0 ? this.to : undefined;
    const message = this.text || to
      ? {
        text: this.text,
        to,
      }
      : {};
    Object.assign(result, {
      to,
      text: this.text,
      slack: {
        message
      },
    });

    return result;
  }

  get simulateMessage() {
    const toList = this.to && this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.simulateMessage', {
      defaultMessage: 'Sample Slack message sent {toList}.',
      values: {
        toList: toList ? `to ${toList}` : '',
      }
    });
  }

  get simulateFailMessage() {
    const toList = this.to && this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.simulateFailMessage', {
      defaultMessage: 'Failed to send sample Slack message {toList}.',
      values: {
        toList: toList ? `to ${toList}` : '',
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new SlackAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.slackAction.TypeName', {
    defaultMessage: 'Slack'
  });
  static iconClass = 'logoSlack';
  static selectMessage = i18n.translate('xpack.watcher.models.slackAction.selectMessageText', {
    defaultMessage: 'Send a message to a Slack user or channel.'
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.slackAction.simulateButtonLabel', {
    defaultMessage: 'Send a sample message'
  });
}
