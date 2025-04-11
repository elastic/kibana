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
  EuiSelect,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { AgentEditState } from '../../../hooks/use_agent_edition';

const USE_CASES = [
  { value: 'customerSupport', text: 'Customer Support' },
  { value: 'dataAnalysis', text: 'Data Analysis' },
];

export interface EditPromptProps {
  onCancel: () => void;
  editState: AgentEditState;
  setFieldValue: <T extends keyof AgentEditState>(key: T, value: AgentEditState[T]) => void;
  submit: () => void;
  isSubmitting: boolean;
}

export const EditPrompt: React.FC<EditPromptProps> = ({
  onCancel,
  editState,
  setFieldValue,
  submit,
  isSubmitting,
}) => {
  const {
    services: { notifications },
  } = useKibana();

  console.log(editState);

  const handleUseCaseChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFieldValue('useCase', e.target.value);
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

      if (!editState.systemPrompt.trim()) {
        notifications.toasts.addDanger(
          i18n.translate('workchatApp.assistants.editPromptModal.promptRequiredError', {
            defaultMessage: 'Prompt is required',
          })
        );
        return;
      }

      submit();
    },
    [submit, notifications.toasts]
  );

  // Get the current useCase from editState or default
  const useCase = editState.useCase;

  return (
    <EuiModal onClose={onCancel} maxWidth={640}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('workchatApp.assistants.editPromptModal.title', {
            defaultMessage: 'Edit prompt',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm component="form" onSubmit={handleSubmit}>
          <EuiFormRow
            label={i18n.translate('workchatApp.assistants.editPromptModal.useCaseLabel', {
              defaultMessage: 'Use case',
            })}
          >
            <EuiSelect
              data-test-subj="assistantUseCaseSelect"
              options={USE_CASES}
              value={useCase}
              onChange={handleUseCaseChange}
              fullWidth
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('workchatApp.assistants.editPromptModal.promptLabel', {
              defaultMessage: 'Prompt',
            })}
          >
            <EuiTextArea
              data-test-subj="assistantPromptTextArea"
              value={editState.systemPrompt}
              onChange={handleSystemPromptChange}
              fullWidth
              rows={8}
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty data-test-subj="cancelPromptButton" onClick={onCancel}>
          {i18n.translate('workchatApp.assistants.editPromptModal.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="savePromptButton"
          fill
          onClick={handleSubmit}
          isLoading={isSubmitting}
        >
          {i18n.translate('workchatApp.assistants.editPromptModal.saveButtonLabel', {
            defaultMessage: 'Save',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
