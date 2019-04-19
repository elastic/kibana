/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { get, isArray } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCode, EuiLink } from '@elastic/eui';
import { watchNotificationSettingsUrl } from '../../lib/documentation_links';

export class SlackAction extends BaseAction {
  constructor(props = {}) {
    super(props);

    const toArray = get(props, 'to', []);
    this.to = isArray(toArray) ? toArray : [ toArray ];
    this.text = props.text;
  }

  validate() {
    const errors = [];

    if (!this.to.length) {
      const message = (
        <FormattedMessage
          id="xpack.watcher.sections.watchEdit.json.slackActionValidationWarningMessage"
          defaultMessage="This watch has a Slack {ymlValue} setting without a 'to' property.
            If this property is already set in your elasticsearch.yml file, you're all set.
            Otherwise, you can include it here in the watch JSON. {link}"
          values={{
            ymlValue: <EuiCode transparentBackground>message_defaults</EuiCode>,
            link: (
              <EuiLink href={watchNotificationSettingsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.watcher.sections.watchEdit.json.slackActionValidationWarningMessage.helpLinkText"
                  defaultMessage="Learn more."
                />
              </EuiLink>
            )
          }}
        />
      );
      errors.push({
        message
      });
    }

    return { errors: errors.length ? errors : null };
  }

  get upstreamJson() {
    const result = super.upstreamJson;
    const message = this.text || this.to.length
      ? {
        text: this.text,
        to: this.to.length ? this.to : undefined
      }
      : undefined;
    Object.assign(result, {
      to: this.to,
      text: this.text,
      slack: {
        message
      }
    });

    return result;
  }

  get description() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.description', {
      defaultMessage: 'Slack message will be sent to {toList}',
      values: {
        toList
      }
    });
  }

  get simulateMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.simulateMessage', {
      defaultMessage: 'Sample Slack message sent to {toList}.',
      values: {
        toList
      }
    });
  }

  get simulateFailMessage() {
    const toList = this.to.join(', ');
    return i18n.translate('xpack.watcher.models.slackAction.simulateFailMessage', {
      defaultMessage: 'Failed to send sample Slack message to {toList}.',
      values: {
        toList
      }
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new SlackAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.slackAction.TypeName', {
    defaultMessage: 'Slack'
  });
  static iconClass = 'kuiIcon fa-slack';
  static template = '<watch-slack-action></watch-slack-action>';
  static selectMessage = i18n.translate('xpack.watcher.models.slackAction.selectMessageText', {
    defaultMessage: 'Send a message to a slack user or channel.'
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.slackAction.simulateButtonLabel', {
    defaultMessage: 'Send a sample message now'
  });
}
