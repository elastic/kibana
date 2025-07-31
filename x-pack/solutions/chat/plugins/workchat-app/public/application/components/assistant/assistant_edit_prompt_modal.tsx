/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { AssistantModalWrapper } from './assistant_modal_wrapper';

export interface EditPromptProps {
  agentId: string;
  onCancel: () => void;
}

export const EditPrompt: React.FC<EditPromptProps> = ({ agentId, onCancel }) => {
  const {
    services: { notifications },
  } = useKibana();

  return (
    <AssistantModalWrapper agentId={agentId} modalType="editPrompt" onClose={onCancel}>
      {({ editState, setFieldValue, submit, isSubmitting }) => {
        const handlePromptChange = useCallback(
          (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setFieldValue('prompt', e.target.value);
          },
          [setFieldValue]
        );

        const handleSystemPromptChange = useCallback(
          (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setFieldValue('systemPrompt', e.target.value);
          },
          [setFieldValue]
        );

        const handleSubmit = useCallback(
          (e: React.FormEvent) => {
            e.preventDefault();

            if (!editState.prompt?.trim() && !editState.systemPrompt?.trim()) {
              notifications.toasts.addDanger(
                i18n.translate('workchatApp.assistants.editPrompt.promptRequiredError', {
                  defaultMessage: 'At least one prompt field is required',
                })
              );
              return;
            }

            submit();
          },
          [editState.prompt, editState.systemPrompt, submit, notifications.toasts]
        );

        return (
          <EuiModal onClose={onCancel} maxWidth={800}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                {i18n.translate('workchatApp.assistants.editPrompt.title', {
                  defaultMessage: 'Edit assistant prompt',
                })}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiForm component="form" onSubmit={handleSubmit} fullWidth>
                <EuiFormRow
                  label={i18n.translate('workchatApp.assistants.editPrompt.systemPromptLabel', {
                    defaultMessage: 'System prompt',
                  })}
                  helpText={i18n.translate('workchatApp.assistants.editPrompt.systemPromptHelp', {
                    defaultMessage: 'Instructions that define how the assistant should behave',
                  })}
                  fullWidth
                >
                  <EuiTextArea
                    data-test-subj="assistantSystemPromptInput"
                    value={editState.systemPrompt || ''}
                    onChange={handleSystemPromptChange}
                    rows={6}
                    fullWidth
                    placeholder={i18n.translate(
                      'workchatApp.assistants.editPrompt.systemPromptPlaceholder',
                      {
                        defaultMessage: 'You are a helpful assistant...',
                      }
                    )}
                  />
                </EuiFormRow>

                <EuiFormRow
                  label={i18n.translate('workchatApp.assistants.editPrompt.promptLabel', {
                    defaultMessage: 'Default prompt',
                  })}
                  helpText={i18n.translate('workchatApp.assistants.editPrompt.promptHelp', {
                    defaultMessage: 'Default instructions or context for conversations',
                  })}
                  fullWidth
                >
                  <EuiTextArea
                    data-test-subj="assistantPromptInput"
                    value={editState.prompt || ''}
                    onChange={handlePromptChange}
                    rows={4}
                    fullWidth
                    placeholder={i18n.translate(
                      'workchatApp.assistants.editPrompt.promptPlaceholder',
                      {
                        defaultMessage: 'Enter default conversation context...',
                      }
                    )}
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty data-test-subj="cancelPromptButton" onClick={onCancel}>
                {i18n.translate('workchatApp.assistants.editPrompt.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>

              <EuiButton
                data-test-subj="savePromptButton"
                fill
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                {i18n.translate('workchatApp.assistants.editPrompt.saveButtonLabel', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiModalFooter>
          </EuiModal>
        );
      }}
    </AssistantModalWrapper>
  );
};
