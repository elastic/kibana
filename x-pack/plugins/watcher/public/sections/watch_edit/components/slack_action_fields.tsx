/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { EuiComboBox, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ErrableFormRow } from '../../../components/form_errors';
import { SlackAction } from '../../../../common/types/action_types';

interface Props {
  action: SlackAction;
  editAction: (changedProperty: { key: string; value: any }) => void;
  errors: { [key: string]: string[] };
  hasErrors: boolean;
}

export const SlackActionFields: React.FunctionComponent<Props> = ({
  action,
  editAction,
  errors,
  hasErrors,
}) => {
  const { text, to } = action;
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
