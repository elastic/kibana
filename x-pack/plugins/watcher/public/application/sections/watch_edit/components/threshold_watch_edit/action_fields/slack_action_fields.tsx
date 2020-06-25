/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiComboBox, EuiTextArea, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SlackAction } from '../../../../../../../common/types/action_types';

interface Props {
  action: SlackAction;
  editAction: (changedProperty: { key: string; value: any }) => void;
  children: React.ReactNode;
}

export const SlackActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  children,
}) => {
  const { text, to } = action;
  const toOptions = to ? to.map((label) => ({ label })) : [];

  return (
    <Fragment>
      {children}
      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.slackAction.recipientTextFieldLabel',
          {
            defaultMessage: 'Recipient (optional)',
          }
        )}
      >
        <EuiComboBox
          noSuggestions
          fullWidth
          selectedOptions={toOptions}
          data-test-subj="slackRecipientComboBox"
          onCreateOption={(searchValue: string) => {
            const newOptions = [...toOptions, { label: searchValue }];
            editAction({ key: 'to', value: newOptions.map((newOption) => newOption.label) });
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction({
              key: 'to',
              value: selectedOptions.map((selectedOption) => selectedOption.label),
            });
          }}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate(
          'xpack.watcher.sections.watchEdit.threshold.slackAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message (optional)',
          }
        )}
      >
        <EuiTextArea
          fullWidth
          name="text"
          value={text}
          data-test-subj="slackMessageTextarea"
          onChange={(e) => {
            editAction({ key: 'text', value: e.target.value });
          }}
        />
      </EuiFormRow>
    </Fragment>
  );
};
