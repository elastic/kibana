/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment, useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiComboBox, EuiButtonEmpty, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ActionParamsProps } from '../../../../types';
import { EmailActionParams } from '../types';
import { TextFieldWithMessageVariables } from '../../text_field_with_message_variables';
import { TextAreaWithMessageVariables } from '../../text_area_with_message_variables';

export const EmailParamsFields = ({
  actionParams,
  editAction,
  index,
  errors,
  messageVariables,
  defaultMessage,
}: ActionParamsProps<EmailActionParams>) => {
  const { to, cc, bcc, subject, message } = actionParams;
  const toOptions = to ? to.map((label: string) => ({ label })) : [];
  const ccOptions = cc ? cc.map((label: string) => ({ label })) : [];
  const bccOptions = bcc ? bcc.map((label: string) => ({ label })) : [];
  const [addCC, setAddCC] = useState<boolean>(false);
  const [addBCC, setAddBCC] = useState<boolean>(false);

  useEffect(() => {
    if (!message && defaultMessage && defaultMessage.length > 0) {
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Fragment>
      <EuiFormRow
        fullWidth
        error={errors.to}
        isInvalid={errors.to.length > 0 && to !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To',
          }
        )}
        labelAppend={
          <Fragment>
            <span>
              {!addCC ? (
                <EuiButtonEmpty size="xs" onClick={() => setAddCC(true)}>
                  <FormattedMessage
                    defaultMessage="Add Cc"
                    id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.addCcButton"
                  />
                </EuiButtonEmpty>
              ) : null}
              {!addBCC ? (
                <EuiButtonEmpty size="xs" onClick={() => setAddBCC(true)}>
                  <FormattedMessage
                    defaultMessage="{titleBcc}"
                    id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.addBccButton"
                    values={{ titleBcc: !addCC ? '/ Bcc' : 'Add Bcc' }}
                  />
                </EuiButtonEmpty>
              ) : null}
            </span>
          </Fragment>
        }
      >
        <EuiComboBox
          noSuggestions
          isInvalid={errors.to.length > 0 && to !== undefined}
          fullWidth
          data-test-subj="toEmailAddressInput"
          selectedOptions={toOptions}
          onCreateOption={(searchValue: string) => {
            const newOptions = [...toOptions, { label: searchValue }];
            editAction(
              'to',
              newOptions.map((newOption) => newOption.label),
              index
            );
          }}
          onChange={(selectedOptions: Array<{ label: string }>) => {
            editAction(
              'to',
              selectedOptions.map((selectedOption) => selectedOption.label),
              index
            );
          }}
          onBlur={() => {
            if (!to) {
              editAction('to', [], index);
            }
          }}
        />
      </EuiFormRow>
      {addCC ? (
        <EuiFormRow
          fullWidth
          error={errors.cc}
          isInvalid={errors.cc.length > 0 && cc !== undefined}
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientCopyTextFieldLabel',
            {
              defaultMessage: 'Cc',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            isInvalid={errors.cc.length > 0 && cc !== undefined}
            fullWidth
            data-test-subj="ccEmailAddressInput"
            selectedOptions={ccOptions}
            onCreateOption={(searchValue: string) => {
              const newOptions = [...ccOptions, { label: searchValue }];
              editAction(
                'cc',
                newOptions.map((newOption) => newOption.label),
                index
              );
            }}
            onChange={(selectedOptions: Array<{ label: string }>) => {
              editAction(
                'cc',
                selectedOptions.map((selectedOption) => selectedOption.label),
                index
              );
            }}
            onBlur={() => {
              if (!cc) {
                editAction('cc', [], index);
              }
            }}
          />
        </EuiFormRow>
      ) : null}
      {addBCC ? (
        <EuiFormRow
          fullWidth
          error={errors.bcc}
          isInvalid={errors.bcc.length > 0 && bcc !== undefined}
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientBccTextFieldLabel',
            {
              defaultMessage: 'Bcc',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            isInvalid={errors.bcc.length > 0 && bcc !== undefined}
            fullWidth
            data-test-subj="bccEmailAddressInput"
            selectedOptions={bccOptions}
            onCreateOption={(searchValue: string) => {
              const newOptions = [...bccOptions, { label: searchValue }];
              editAction(
                'bcc',
                newOptions.map((newOption) => newOption.label),
                index
              );
            }}
            onChange={(selectedOptions: Array<{ label: string }>) => {
              editAction(
                'bcc',
                selectedOptions.map((selectedOption) => selectedOption.label),
                index
              );
            }}
            onBlur={() => {
              if (!bcc) {
                editAction('bcc', [], index);
              }
            }}
          />
        </EuiFormRow>
      ) : null}
      <EuiFormRow
        fullWidth
        error={errors.subject}
        isInvalid={errors.subject.length > 0 && subject !== undefined}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.subjectTextFieldLabel',
          {
            defaultMessage: 'Subject',
          }
        )}
      >
        <TextFieldWithMessageVariables
          index={index}
          editAction={editAction}
          messageVariables={messageVariables}
          paramsProperty={'subject'}
          inputTargetValue={subject}
          errors={errors.subject as string[]}
        />
      </EuiFormRow>
      <TextAreaWithMessageVariables
        index={index}
        editAction={editAction}
        messageVariables={messageVariables}
        paramsProperty={'message'}
        inputTargetValue={message}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.messageTextAreaFieldLabel',
          {
            defaultMessage: 'Message',
          }
        )}
        errors={errors.message as string[]}
      />
    </Fragment>
  );
};

// eslint-disable-next-line import/no-default-export
export { EmailParamsFields as default };
