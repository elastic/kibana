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
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { useKibana } from '../../hooks/use_kibana';
import { AgentEditState, useAgentEdition } from '../../hooks/use_agent_edition';
import type { Agent } from '../../../../common/agents';
import { appPaths } from '../../app_paths';
import { useNavigation } from '../../hooks/use_navigation';
import { assistantLabels } from './i18n';

export interface CreateNewAssistantModalProps {
  onClose: () => void;
}

export const CreateNewAssistantModal: React.FC<CreateNewAssistantModalProps> = ({ onClose }) => {
  const {
    services: { notifications },
  } = useKibana();

  const { navigateToWorkchatUrl } = useNavigation();

  const onSaveSuccess = useCallback(
    (agent: Agent) => {
      notifications.toasts.addSuccess(
        i18n.translate('workchatApp.assistants.createSuccessMessage', {
          defaultMessage: 'Assistant created successfully',
        })
      );
      onClose();
      navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: agent.id }));
    },
    [notifications, onClose, navigateToWorkchatUrl]
  );

  const onSaveError = useCallback(
    (err: Error) => {
      notifications.toasts.addError(err, {
        title: 'Error',
      });
    },
    [notifications]
  );

  const { state, isSubmitting, submit } = useAgentEdition({
    onSaveSuccess,
    onSaveError,
  });

  const formMethods = useForm<AgentEditState>({
    values: state,
  });

  const { handleSubmit, control } = formMethods;

  return (
    <EuiModal onClose={onClose} style={{ width: 640 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('workchatApp.assistants.create.title', {
            defaultMessage: 'Create new assistant',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <FormProvider {...formMethods}>
          <EuiForm component="form" onSubmit={handleSubmit((data) => submit(data))} fullWidth>
            <EuiFormRow
              label={i18n.translate('workchatApp.assistants.create.nameLabel', {
                defaultMessage: 'Name',
              })}
              fullWidth
            >
              <Controller
                rules={{ required: true }}
                name="name"
                control={control}
                render={({ field }) => (
                  <EuiFieldText data-test-subj="assistantNameInput" {...field} fullWidth />
                )}
              />
            </EuiFormRow>
          </EuiForm>
        </FormProvider>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {assistantLabels.editView.cancelButtonLabel}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="saveBasicInfoButton"
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
