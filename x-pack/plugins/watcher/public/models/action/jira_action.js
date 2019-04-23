/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { BaseAction } from './base_action';
import { i18n } from '@kbn/i18n';

export class JiraAction extends BaseAction {
  constructor(props = {}) {
    super(props);
    this.account = get(props, 'account');
    this.projectKey = get(props, 'projectKey');
    this.issueType = get(props, 'issueType');
    this.summary = get(props, 'summary');
  }

  validate() {
    const errors = {
      projectKey: [],
      issueType: [],
      summary: [],
    };
    if (!this.projectKey) {
      errors.projectKey.push(
        i18n.translate('xpack.watcher.watchActions.jira.projectKeyIsRequiredValidationMessage', {
          defaultMessage: 'Jira project key is required.',
        })
      );
    }
    if (!this.issueType) {
      errors.issueType.push(
        i18n.translate('xpack.watcher.watchActions.jira.issueTypeNameIsRequiredValidationMessage', {
          defaultMessage: 'Jira issue type is required.',
        })
      );
    }
    if (!this.summary) {
      errors.summary.push(
        i18n.translate('xpack.watcher.watchActions.jira.summaryIsRequiredValidationMessage', {
          defaultMessage: 'Jira summary is required.',
        })
      );
    }
    return errors;
  }

  get upstreamJson() {
    const result = super.upstreamJson;

    Object.assign(result, {
      projectKey: this.projectKey,
      account: this.account ? this.account : null,
      issueType: this.issueType,
      summary: this.summary,
      jira: {
        fields: {
          project: {
            key: this.projectKey,
          },
          issuetype: {
            name: this.issueType,
          },
          summary: this.summary,
        },
        account: this.account ? this.account : null,
      }
    });

    return result;
  }

  get simulateMessage() {
    return i18n.translate('xpack.watcher.models.jiraAction.simulateMessage', {
      defaultMessage: 'Jira issue has been created.',
    });
  }

  get simulateFailMessage() {
    return i18n.translate('xpack.watcher.models.jiraAction.simulateFailMessage', {
      defaultMessage: 'Failed to create Jira issue.',
    });
  }

  static fromUpstreamJson(upstreamAction) {
    return new JiraAction(upstreamAction);
  }

  static typeName = i18n.translate('xpack.watcher.models.jiraAction.typeName', {
    defaultMessage: 'Jira',
  });
  static iconClass = 'apps';
  static selectMessage = i18n.translate('xpack.watcher.models.jiraAction.selectMessageText', {
    defaultMessage: 'Create issues in Atlassian’s Jira Software.',
  });
  static simulatePrompt = i18n.translate('xpack.watcher.models.jiraAction.simulateButtonLabel', {
    defaultMessage: 'Create a sample Jira issue now'
  });
  static defaults = {
    summary: 'Watch [{{ctx.metadata.name}}] has exceeded the threshold'
  };
}
