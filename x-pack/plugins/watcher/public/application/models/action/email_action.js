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

    this.to = isArray(toArray) ? toArray : toArray && [toArray];

    const defaultSubject = i18n.translate('xpack.watcher.models.emailAction.defaultSubjectText', {
      defaultMessage: 'Watch [{context}] has exceeded the threshold',
      values: {
        context: '{{ctx.metadata.name}}',
      },
    });

    this.subject = get(props, 'subject', props.ignoreDefaults ? null : defaultSubject);

    this.body = get(props, 'body');
  }

  validate() {
    const errors = {
      to: [],
    };

    if (!this.to || !this.to.length) {
      errors.to.push(
        i18n.translate(
          'xpack.watcher.watchActions.email.emailRecipientIsRequiredValidationMessage',
          {
            defaultMessage: '"To" email address is required.',
          }
        )
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
        to: this.to && this.to.length > 0 ? this.to : undefined,
        subject: this.subject,
        body: {
          text: this.body,
        },
      },
    });

    return result;
  }

  get simulateMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.emailAction.simulateMessage', {
      defaultMessage: 'Sample email sent to {toList}',
      values: {
        toList,
      },
    });
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.emailAction.simulateFailMessage', {
      defaultMessage: 'Failed to send email to {toList}.',
      values: {
        toList,
      },
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new EmailAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.emailAction.typeName', {
    defaultMessage: 'Email',
  });
  static iconClass = 'email';
  static selectMessage = i18n.translate('xpack.watcher.models.emailAction.selectMessageText', {
    defaultMessage: 'Send an email from your server.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.emailAction.simulateButtonLabel', {
    defaultMessage: 'Send test email',
  });
}
