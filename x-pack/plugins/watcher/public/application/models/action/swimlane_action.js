/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

export class SwimlaneAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    const defaultDescription = i18n.translate(
      'xpack.watcher.models.swimlaneAction.defaultDescriptionText',
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
          'xpack.watcher.watchActions.swimlane.descriptionIsRequiredValidationMessage',
          {
            defaultMessage: 'Swimlane description is required.',
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
      swimlane: {
        description: this.description,
      },
    });

    return result;
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.swimlaneAction.simulateMessage', {
      defaultMessage: 'Swimlane event has been sent.',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.swimlaneAction.simulateFailMessage', {
      defaultMessage: 'Failed to send Swimlane event.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new SwimlaneAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.swimlaneAction.typeName', {
    defaultMessage: 'Swimlane',
  });
  static iconClass = 'apps';
  static selectMessage = i18n.translate('xpack.watcher.models.swimlaneAction.selectMessageText', {
    defaultMessage: 'Create an event in Swimlane.',
  });
  static simulatePrompt = i18n.translate(
    'xpack.watcher.models.swimlaneAction.simulateButtonLabel',
    {
      defaultMessage: 'Send a Swimlane event',
    }
  );
}
