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

    const defaultDescription = i18n.translate(
      'xpack.watcher.models.pagerdutyAction.defaultDescriptionText',
      {
        defaultMessage: 'Watch [{context}] has exceeded the threshold',
        values: {
          context: '{{ctx.metadata.name}}',
        },
      }
    );
    this.description = get(props, 'description', props.ignoreDefaults ? null : defaultDescription);
  }

  validate() {
    const errors = {
      description: [],
    };

    if (!this.description) {
      errors.description.push(
        i18n.translate(
          'xpack.watcher.watchActions.pagerduty.descriptionIsRequiredValidationMessage',
          {
            defaultMessage: 'PagerDuty description is required.',
          }
        )
      );
    }
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      description: this.description,
      pagerduty: {
        description: this.description,
      },
    });

    return result;
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
    defaultMessage: 'Create an event in PagerDuty.',
  });
  static simulatePrompt = i18n.translate(
    'xpack.watcher.models.pagerDutyAction.simulateButtonLabel',
    {
      defaultMessage: 'Send a PagerDuty event',
    }
  );
}
