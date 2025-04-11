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
import { useAgentEdition } from '../../../hooks/use_agent_edition';
import { assistantLabels } from '../i18n';

const USE_CASES = [
  { value: 'customerSupport', text: 'Customer Support' },
  { value: 'dataAnalysis', text: 'Data Analysis' },
];

export interface EditPromptProps {
  onClose: () => void;
  onSaveSuccess: () => void;
  agentId: string;
}

export const EditPrompt: React.FC<EditPromptProps> = ({ onClose, onSaveSuccess, agentId }) => {
  const {
    services: { notifications },
  } = useKibana();

  const { editState, setFieldValue, submit, isSubmitting } = useAgentEdition({
    agentId,
    onSaveSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('workchatApp.assistants.editPromptModal.saveSuccessMessage', {
          defaultMessage: 'Assistant updated successfully',
        })
      );
      onSaveSuccess();
      onClose();
    },
  });

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
    [editState.systemPrompt, submit, notifications.toasts]
  );

  // Get the current useCase from editState or default
  const useCase = editState.useCase;

  return (
    <EuiModal onClose={onClose} style={{ width: 800 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('workchatApp.assistants.editPromptModal.title', {
            defaultMessage: 'Edit prompt',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm component="form" onSubmit={handleSubmit} fullWidth>
          <EuiFormRow
            label={i18n.translate('workchatApp.assistants.editPromptModal.useCaseLabel', {
              defaultMessage: 'Use case',
            })}
            fullWidth
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
            fullWidth
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
        <EuiButtonEmpty onClick={onClose}>
          {assistantLabels.editView.cancelButtonLabel}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="savePromptButton"
          fill
          onClick={handleSubmit}
          isLoading={isSubmitting}
        >
          {assistantLabels.editView.saveButtonLabel}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
