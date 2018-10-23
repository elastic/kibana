/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

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
    return i18n.translate('xpack.watcher.models.loggingAction.description', {
      defaultMessage: 'Log message \'{text}\'',
      values: {
        text
      }
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.loggingAction.simulateMessage', {
      defaultMessage: 'Sample message logged',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.loggingAction.simulateFailMessage', {
      defaultMessage: 'Failed to log sample message.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new LoggingAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.loggingAction.typeName', {
    defaultMessage: 'Logging',
  });
  static iconClass = 'kuiIcon fa-file-text-o';
  static selectMessage = i18n.translate('xpack.watcher.models.loggingAction.selectMessageText', {
    defaultMessage: 'Add a new item to the logs.',
  });
  static template = '<watch-logging-action></watch-logging-action>';
  static simulatePrompt = i18n.translate('xpack.watcher.models.loggingAction.simulateButtonLabel', {
    defaultMessage: 'Log a sample message now',
  });
}
