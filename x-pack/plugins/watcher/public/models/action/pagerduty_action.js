/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

export class PagerDutyAction extends BaseAction {
  constructor(props = {}) {
    super(props);
    this.message = get(props, 'message');
  }

  validateAction() {
    const errors = {
      message: [],
    };

    if (!this.message) {
      errors.message.push(
        i18n.translate('xpack.watcher.watchActions.pagerduty.descriptionIsRequiredValidationMessage', {
          defaultMessage: 'Description is required.',
        })
      );
    }
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      description: this.message,
      pagerduty: {
        description: this.message,
      }
    });

    return result;
  }

  get description() {
    return i18n.translate('xpack.watcher.models.pagerDutyAction.description', {
      defaultMessage: 'A message will be sent to PagerDuty',
    });
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.pagerDutyAction.simulateMessage', {
      defaultMessage: 'PagerDuty event has been sent.',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.pagerDutyAction.simulateFailMessage', {
      defaultMessage: 'Failed to send PagerDuty event.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new PagerDutyAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.pagerDutyAction.typeName', {
    defaultMessage: 'PagerDuty',
  });
  static iconClass = 'apps';
  static selectMessage = i18n.translate('xpack.watcher.models.pagerDutyAction.selectMessageText', {
    defaultMessage: 'Create events in PagerDuty.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.pagerDutyAction.simulateButtonLabel', {
    defaultMessage: 'Test fire a PagerDuty event'
  });
  static defaults = {
    message: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold'
  };
}

