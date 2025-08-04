/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useEffect } from 'react';
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
  EuiSpacer,
  EuiSuperSelect,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useAgentEdition } from '../../../hooks/use_agent_edition';
import { assistantLabels } from '../i18n';
import { ASSISTANT_USE_CASES } from '../constants';

export interface EditPromptProps {
  onClose: () => void;
  onSaveSuccess: () => void;
  agentId: string;
}

export const EditPrompt: React.FC<EditPromptProps> = ({ onClose, onSaveSuccess, agentId }) => {
  const modalTitleId = useGeneratedHtmlId();

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

  const { control, handleSubmit, watch, setValue } = useForm({
    values: state,
  });

  const useCase = watch('useCase');

  useEffect(() => {
    if (useCase && useCase !== 'custom') {
      const selectedUseCase = ASSISTANT_USE_CASES.find((uc) => uc.value === useCase);
      if (selectedUseCase && selectedUseCase.prompt) {
        setValue('systemPrompt', selectedUseCase.prompt);
      }
    }
  }, [useCase, setValue]);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setValue('systemPrompt', newPrompt);

    if (useCase !== 'custom') {
      setValue('useCase', 'custom');
    }
  };

  return (
    <EuiModal onClose={onClose} style={{ width: 800 }} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
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
                <EuiSuperSelect
                  data-test-subj="assistantUseCaseSelect"
                  options={ASSISTANT_USE_CASES.map(({ label, value, description }) => ({
                    inputDisplay: label,
                    value,
                    dropdownDisplay: (
                      <Fragment>
                        <strong>{label}</strong>
                        {!!description && (
                          <EuiText size="s" color="subdued">
                            {description}
                          </EuiText>
                        )}
                      </Fragment>
                    ),
                  }))}
                  {...field}
                  valueOfSelected={field.value}
                  hasDividers
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
                  onChange={handlePromptChange}
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
