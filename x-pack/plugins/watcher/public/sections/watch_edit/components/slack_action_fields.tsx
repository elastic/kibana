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

export const SlackActionFields: React.FunctionComponent<Props> = ({ action, editAction }) => {
  const { text, to } = action;
  const errors = action.validateAction();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  return (
    <Fragment>
      <ErrableFormRow
        id="slackRecipient"
        errorKey="to"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && to !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.slackAction.recipientTextFieldLabel',
          {
            defaultMessage: 'Recipient',
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
        id="slackMessage"
        errorKey="text"
        fullWidth
        errors={errors}
        isShowingErrors={hasErrors && text !== undefined}
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          name="text"
          value={text}
          onChange={e => {
            editAction({ key: 'text', value: e.target.value });
          }}
          onBlur={() => {
            if (!text) {
              editAction({ key: 'text', value: [] });
            }
          }}
        />
      </ErrableFormRow>
    </Fragment>
  );
};
