/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import { EuiFieldText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../../../components/form_errors';
import { JiraAction } from '../../../../../../../common/types/action_types';

interface Props {
  action: JiraAction;
  editAction: (changedProperty: { key: string; value: any }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
  children: React.ReactNode;
}

export const JiraActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  errors,
  hasErrors,
  children,
}) => {
  const { projectKey, issueType, summary } = action;

  return (
    <Fragment>
      {children}

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
          data-test-subj="jiraProjectKeyInput"
          onChange={(e) => {
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
          data-test-subj="jiraIssueTypeInput"
          onChange={(e) => {
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
          data-test-subj="jiraSummaryInput"
          onChange={(e) => {
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
