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

    const defaultText = i18n.translate('xpack.watcher.models.loggingAction.defaultText', {
      defaultMessage: 'Watch [{context}] has exceeded the threshold',
      values: {
        context: '{{ctx.metadata.name}}',
      },
    });
    this.text = get(props, 'text', props.ignoreDefaults ? null : defaultText);
  }

  validate() {
    const errors = {
      text: [],
    };
    if (!this.text) {
      errors.text.push(
        i18n.translate('xpack.watcher.watchActions.logging.logTextIsRequiredValidationMessage', {
          defaultMessage: 'Log text is required.',
        })
      );
    }
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;
    let text;

    if (typeof this.text === 'string') {
      // If this.text is a non-empty string, we can send it to the API.
      if (!!this.text.trim()) {
        text = this.text;
      }
    } else {
      // If the user incorrectly defined this.text, e.g. as an object in a JSON watch, let the API
      // deal with it.
      text = this.text;
    }

    Object.assign(result, {
      text,
      logging: {
        text,
      },
    });

    return result;
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
  static iconClass = 'logsApp';
  static selectMessage = i18n.translate('xpack.watcher.models.loggingAction.selectMessageText', {
    defaultMessage: 'Add an item to the logs.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.loggingAction.simulateButtonLabel', {
    defaultMessage: 'Log a sample message',
  });
}
