/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

const requiredFields = ['host', 'port'];
const optionalFields = [
  'scheme',
  'path',
  'method',
  'headers',
  'params',
  'auth',
  'body',
  'proxy',
  'connection_timeout',
  'read_timeout',
  'url'
];

const allFields = [...requiredFields, ...optionalFields];

export class WebhookAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    allFields.forEach((field) => {
      this[field] = get(props, field);
    });

    this.fullPath = this.url ? this.url : this.host + this.port + this.path;
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
    return i18n.translate('xpack.watcher.models.webhookAction.description', {
      defaultMessage: 'Webhook will trigger a {method} request on {fullPath}',
      values: {
        method: this.method,
        fullPath: this.fullPath
      }
    });
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

  /**
   * NOTE:
   *
   * I don't seem to find in the UI where those static properties are actuall used.
   * It looks like we used to have a UI to create an action and that currently we only have
   * the "advanced watcher" creation through the JSON editor.
   *
   * ---> ./components/watch_actions/components/watch_action/watch_actions.html
   * is where it seems that this is read. But I can't access that component navigatint the UI
   *
   */
  // static typeName = i18n.translate('xpack.watcher.models.webhookAction.typeName', {
  //   defaultMessage: 'E-mail',
  // });
  // static iconClass = 'kuiIcon fa-envelope-o';
  // static template = '<watch-email-action></watch-email-action>';
  // static selectMessage = i18n.translate('xpack.watcher.models.webhookAction.selectMessageText', {
  //   defaultMessage: 'Send out an e-mail from your server.',
  // });
  // static simulatePrompt = i18n.translate('xpack.watcher.models.webhookAction.simulateButtonLabel', {
  //   defaultMessage: 'Test fire an e-mail now'
  // });
}
