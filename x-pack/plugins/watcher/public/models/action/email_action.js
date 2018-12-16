/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isArray } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

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
      body: this.body,
      email: {
        to: this.to.length ? this.to : undefined,
      }
    });

    return result;
  }

  get description() {
    const toList = this.to.join(', ');
    const subject = this.subject || '';
    return i18n.translate('xpack.watcher.models.emailAction.description', {
      defaultMessage: '"{subject}" will be sent to {toList}',
      values: {
        subject,
        toList
      }
    });
  }

  get simulateMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.emailAction.simulateMessage', {
      defaultMessage: 'Sample e-mail sent to {toList}',
      values: {
        toList
      }
    });
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.emailAction.simulateFailMessage', {
      defaultMessage: 'Failed to send e-mail to {toList}.',
      values: {
        toList
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new EmailAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.emailAction.typeName', {
    defaultMessage: 'E-mail',
  });
  static iconClass = 'kuiIcon fa-envelope-o';
  static template = '<watch-email-action></watch-email-action>';
  static selectMessage = i18n.translate('xpack.watcher.models.emailAction.selectMessageText', {
    defaultMessage: 'Send out an e-mail from your server.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.emailAction.simulateButtonLabel', {
    defaultMessage: 'Test fire an e-mail now'
  });
}
