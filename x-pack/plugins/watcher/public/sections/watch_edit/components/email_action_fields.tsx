/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';

import { EuiComboBox, EuiFieldText, EuiFormRow, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/form_errors';
import { EmailAction } from '../../../../common/types/action_types';

interface Props {
  action: EmailAction;
  editAction: (changedProperty: { key: string; value: any }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const EmailActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { to, subject, body } = action;
  const [toOptions, setToOptions] = useState<Array<{ label: string }>>([]);

  useEffect(() => {
    if (to && to.length > 0) {
      const toOptionsList = to.map(toItem => {
        return {
          label: toItem,
        };
      });
      setToOptions(toOptionsList);
    }
  }, []);

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
        <EuiComboBox
          noSuggestions
          fullWidth
          selectedOptions={toOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...toOptions, { label: searchValue }];
            setToOptions(newOptions);
            editAction({ key: 'to', value: newOptions.map(newOption => newOption.label) });
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            setToOptions(selectedOptions);
            editAction({
              key: 'to',
              value: selectedOptions.map(selectedOption => selectedOption.label),
            });
          }}
        />
      </ErrableFormRow>
      <EuiFormRow
        fullWidth
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
        />
      </EuiFormRow>
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
