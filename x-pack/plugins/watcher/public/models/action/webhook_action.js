/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

export class WebhookAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    const defaultJson = JSON.stringify({ message: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold' }, null, 2);
    this.body = get(props, 'body', props.ignoreDefaults ? null : defaultJson);

    this.method = get(props, 'method');
    this.host = get(props, 'host');
    this.port = get(props, 'port');
    this.path = get(props, 'path');
    this.contentType = get(props, 'contentType');

    this.fullPath = `${this.host}:${this.port}${this.path}`;
  }

  validate() {
    const errors = {
      host: [],
      port: [],
      body: [],
    };

    if (!this.host) {
      errors.host.push(
        i18n.translate('xpack.watcher.watchActions.webhook.hostIsRequiredValidationMessage', {
          defaultMessage: 'Webhook host is required.',
        })
      );
    }
    if (!this.port) {
      errors.port.push(
        i18n.translate('xpack.watcher.watchActions.webhook.portIsRequiredValidationMessage', {
          defaultMessage: 'Webhook port is required.',
        })
      );
    }
    if (this.contentType === 'application/json' && typeof this.body === 'string' && this.body !== '') {
      try {
        const parsedJson = JSON.parse(this.body);
        if (parsedJson && typeof parsedJson !== 'object') {
          errors.body.push(i18n.translate('xpack.watcher.watchActions.webhook.bodyParseValidationMessage', {
            defaultMessage: 'Invalid JSON',
          }));
        }
      } catch (e) {
        errors.body.push(i18n.translate('xpack.watcher.watchActions.webhook.bodyParseValidationMessage', {
          defaultMessage: 'Invalid JSON',
        }));
      }
    }
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      method: this.method,
      host: this.host,
      port: this.port,
      path: this.path,
      body: this.body,
      webhook: {
        host: this.host,
        port: this.port,
      }
    });

    return result;
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.webhookAction.simulateMessage', {
      defaultMessage: 'Sample request sent to {fullPath}',
      values: {
        fullPath: this.fullPath
      }
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.webhookAction.simulateFailMessage', {
      defaultMessage: 'Failed to send request to {fullPath}.',
      values: {
        fullPath: this.fullPath
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new WebhookAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.webhookAction.typeName', {
    defaultMessage: 'Webhook',
  });
  static iconClass = 'logoWebhook';
  static selectMessage = i18n.translate('xpack.watcher.models.webhookAction.selectMessageText', {
    defaultMessage: 'Send a request to any web service.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.webhookAction.simulateButtonLabel', {
    defaultMessage: 'Send request now',
  });
}
