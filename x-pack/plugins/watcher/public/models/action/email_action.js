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

    const toArray = get(props, 'to');
    this.to = isArray(toArray) ? toArray : toArray && [ toArray ];
    this.subject = get(props, 'subject');
    this.body = get(props, 'body');
  }

  validateAction() {
    const errors = {
      to: [],
      subject: [],
      body: [],
    };
    if (!this.to || this.to.length === 0) {
      errors.to.push(
        i18n.translate('xpack.watcher.watchActions.email.emailRecipientIsRequiredValidationMessage', {
          defaultMessage: 'To email address is required.',
        })
      );
    }
    if (!this.subject) {
      errors.subject.push(
        i18n.translate('xpack.watcher.watchActions.email.emailSubhectIsRequiredValidationMessage', {
          defaultMessage: 'Subject is required.',
        })
      );
    }
    if (!this.body) {
      errors.body.push(
        i18n.translate('xpack.watcher.watchActions.email.emailBodyIsRequiredValidationMessage', {
          defaultMessage: 'Body is required.',
        })
      );
    }
    return errors;
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
      defaultMessage: 'Sample email sent to {toList}',
      values: {
        toList
      }
    });
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.emailAction.simulateFailMessage', {
      defaultMessage: 'Failed to send email to {toList}.',
      values: {
        toList
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new EmailAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.emailAction.typeName', {
    defaultMessage: 'Email',
  });
  static iconClass = 'email';
  static template = '<watch-email-action></watch-email-action>';
  static selectMessage = i18n.translate('xpack.watcher.models.emailAction.selectMessageText', {
    defaultMessage: 'Send out an email from your server.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.emailAction.simulateButtonLabel', {
    defaultMessage: 'Test fire an email now'
  });
  static defaults = {
    subject: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold'
  };
}
