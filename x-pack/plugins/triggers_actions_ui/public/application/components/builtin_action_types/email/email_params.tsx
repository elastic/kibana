/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
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
  isLoading,
  isDisabled,
  showEmailSubjectAndMessage = true,
}: ActionParamsProps<EmailActionParams>) => {
  const { to, cc, bcc, subject, message } = actionParams;
  const toOptions = to ? to.map((label: string) => ({ label })) : [];
  const ccOptions = cc ? cc.map((label: string) => ({ label })) : [];
  const bccOptions = bcc ? bcc.map((label: string) => ({ label })) : [];
  const [addCC, setAddCC] = useState<boolean>(false);
  const [addBCC, setAddBCC] = useState<boolean>(false);

  const [[isUsingDefault, defaultMessageUsed], setDefaultMessageUsage] = useState<
    [boolean, string | undefined]
  >([false, defaultMessage]);
  useEffect(() => {
    if (
      !actionParams?.message ||
      (isUsingDefault &&
        actionParams?.message === defaultMessageUsed &&
        defaultMessageUsed !== defaultMessage)
    ) {
      setDefaultMessageUsage([true, defaultMessage]);
      editAction('message', defaultMessage, index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultMessage]);
  const isToInvalid: boolean = to !== undefined && errors.to !== undefined && errors.to.length > 0;
  const isSubjectInvalid: boolean =
    subject !== undefined && errors.subject !== undefined && errors.subject.length > 0;
  const isCCInvalid: boolean = errors.cc !== undefined && errors.cc.length > 0 && cc !== undefined;
  const isBCCInvalid: boolean =
    errors.bcc !== undefined && errors.bcc.length > 0 && bcc !== undefined;
  return (
    <>
      <EuiFormRow
        fullWidth
        error={errors.to}
        isInvalid={isToInvalid}
        label={i18n.translate(
          'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientTextFieldLabel',
          {
            defaultMessage: 'To',
          }
        )}
        labelAppend={
          <>
            <span>
              {!addCC && (!cc || cc?.length === 0) ? (
                <EuiButtonEmpty size="xs" onClick={() => setAddCC(true)}>
                  <FormattedMessage
                    defaultMessage="Cc"
                    id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.addCcButton"
                  />
                </EuiButtonEmpty>
              ) : null}
              {!addBCC && (!bcc || bcc?.length === 0) ? (
                <EuiButtonEmpty size="xs" onClick={() => setAddBCC(true)}>
                  <FormattedMessage
                    defaultMessage="Bcc"
                    id="xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.addBccButton"
                  />
                </EuiButtonEmpty>
              ) : null}
            </span>
          </>
        }
      >
        <EuiComboBox
          noSuggestions
          isInvalid={isToInvalid}
          isLoading={isLoading}
          isDisabled={isDisabled}
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
      {addCC || (cc && cc?.length > 0) ? (
        <EuiFormRow
          fullWidth
          error={errors.cc}
          isInvalid={isCCInvalid}
          isDisabled={isDisabled}
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientCopyTextFieldLabel',
            {
              defaultMessage: 'Cc',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            isInvalid={isCCInvalid}
            isLoading={isLoading}
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
      {addBCC || (bcc && bcc?.length > 0) ? (
        <EuiFormRow
          fullWidth
          error={errors.bcc}
          isInvalid={isBCCInvalid}
          label={i18n.translate(
            'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.recipientBccTextFieldLabel',
            {
              defaultMessage: 'Bcc',
            }
          )}
        >
          <EuiComboBox
            noSuggestions
            isInvalid={isBCCInvalid}
            isDisabled={isDisabled}
            isLoading={isLoading}
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
      {showEmailSubjectAndMessage && (
        <EuiFormRow
          fullWidth
          error={errors.subject}
          isInvalid={isSubjectInvalid}
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
            errors={(errors.subject ?? []) as string[]}
          />
        </EuiFormRow>
      )}
      {showEmailSubjectAndMessage && (
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
          errors={(errors.message ?? []) as string[]}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { EmailParamsFields as default };
