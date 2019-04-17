/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';

import { EuiFieldText, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/form_errors';

interface Props {
  action: {};
  editAction: (changedProperty: { key: string; value: any }) => void;
}

export const EmailActionFields: React.FunctionComponent<Props> = ({ action, editAction }) => {
  const { to, subject, body } = action;
  const errors = action.validateAction();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);

  return (
    <Fragment>
      <ErrableFormRow
        id="emailRecipient"
        errorKey="to"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && to !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To email address',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="to"
          value={Array.isArray(to) ? to.join(', ') : ''}
          onChange={e => {
            const toValues = e.target.value;
            const toArray = (toValues || '').split(',').map(toVal => toVal.trim());
            editAction({ key: 'to', value: toArray.join(', ') });
          }}
          onBlur={() => {
            if (!to) {
              editAction({ key: 'to', value: [] });
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        id="emailSubject"
        errorKey="subject"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && subject !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject',
          }
        )}
      >
        <EuiFieldText
          fullWidth
          name="subject"
          value={subject || ''}
          onChange={e => {
            editAction({ key: 'subject', value: e.target.value });
          }}
          onBlur={() => {
            if (!subject) {
              editAction({ key: 'subject', value: '' });
            }
          }}
        />
      </ErrableFormRow>
      <ErrableFormRow
        id="emailBody"
        errorKey="body"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && body !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.emailAction.bodyTextAreaFieldLabel',
          {
            defaultMessage: 'Body',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          value={body || ''}
          name="body"
          onChange={e => {
            editAction({ key: 'body', value: e.target.value });
          }}
          onBlur={() => {
            if (!body) {
              editAction({ key: 'body', value: '' });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
