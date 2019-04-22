/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/form_errors';

interface Props {
  action: {};
  editAction: (changedProperty: { key: string; value: any }) => void;
}

export const JiraActionFields: React.FunctionComponent<Props> = ({ action, editAction }) => {
  const { account, projectKey, issueType, summary } = action;
  const errors = action.validateAction();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.jiraAction.acccountTextFieldLabel',
          {
            defaultMessage: 'Account',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="account"
          value={account || ''}
          onChange={e => {
            editAction({ key: 'account', value: e.target.value });
          }}
        />
      </EuiFormRow>
      <ErrableFormRow
        id="jiraProjectKey"
        errorKey="projectKey"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && projectKey !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.jiraAction.projectKeyFieldLabel',
          {
            defaultMessage: 'Project key',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="projectKey"
          value={projectKey || ''}
          onChange={e => {
            editAction({ key: 'projectKey', value: e.target.value });
          }}
          onBlur={() => {
            if (!projectKey) {
              editAction({ key: 'projectKey', value: '' });
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        id="jiraIssueType"
        errorKey="issueType"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && issueType !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.jiraAction.issueTypeFieldLabel',
          {
            defaultMessage: 'Issue type',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          value={issueType || ''}
          name="issueType"
          onChange={e => {
            editAction({ key: 'issueType', value: e.target.value });
          }}
          onBlur={() => {
            if (!issueType) {
              editAction({ key: 'issueType', value: '' });
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        id="jiraSummary"
        errorKey="summary"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && summary !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.jiraAction.summaryFieldLabel',
          {
            defaultMessage: 'Summary',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          value={summary || ''}
          name="summary"
          onChange={e => {
            editAction({ key: 'summary', value: e.target.value });
          }}
          onBlur={() => {
            if (!summary) {
              editAction({ key: 'summary', value: '' });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
