/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
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

  const { state, submit, isSubmitting } = useAgentEdition({
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

  const { control, handleSubmit } = useForm({
    values: state,
  });

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
        <EuiForm component="form" onSubmit={handleSubmit((data) => submit(data))} fullWidth>
          <Controller
            name="useCase"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('workchatApp.assistants.editPromptModal.useCaseLabel', {
                  defaultMessage: 'Use case',
                })}
                fullWidth
              >
                <EuiSelect
                  data-test-subj="assistantUseCaseSelect"
                  options={USE_CASES}
                  {...field}
                  fullWidth
                />
              </EuiFormRow>
            )}
          />

          <EuiSpacer size="m" />

          <Controller
            name="systemPrompt"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('workchatApp.assistants.editPromptModal.promptLabel', {
                  defaultMessage: 'Prompt',
                })}
                fullWidth
              >
                <EuiTextArea
                  data-test-subj="assistantPromptTextArea"
                  {...field}
                  fullWidth
                  rows={8}
                />
              </EuiFormRow>
            )}
          />
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {assistantLabels.editView.cancelButtonLabel}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="savePromptButton"
          fill
          onClick={handleSubmit((data) => submit(data))}
          isLoading={isSubmitting}
        >
          {assistantLabels.editView.saveButtonLabel}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
