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
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';
import { AssistantModalWrapper } from './assistant_modal_wrapper';

export interface EditAssistantBasicInfoProps {
  agentId: string;
  onCancel: () => void;
}

export const EditAssistantBasicInfo: React.FC<EditAssistantBasicInfoProps> = ({
  agentId,
  onCancel,
}) => {
  const {
    services: { notifications },
  } = useKibana();

  return (
    <AssistantModalWrapper agentId={agentId} modalType="editName" onClose={onCancel}>
      {({ editState, setFieldValue, submit, isSubmitting }) => {
        const handleNameChange = useCallback(
          (e: React.ChangeEvent<HTMLInputElement>) => {
            setFieldValue('name', e.target.value);
          },
          [setFieldValue]
        );

        const handleDescriptionChange = useCallback(
          (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setFieldValue('description', e.target.value);
          },
          [setFieldValue]
        );

        const handleSubmit = useCallback(
          (e: React.FormEvent) => {
            e.preventDefault();

            if (!editState.name?.trim()) {
              notifications.toasts.addDanger(
                i18n.translate('workchatApp.assistants.editBasicInfo.nameRequiredError', {
                  defaultMessage: 'Name is required',
                })
              );
              return;
            }

            submit();
          },
          [editState.name, submit, notifications.toasts]
        );

        return (
          <EuiModal onClose={onCancel} maxWidth={640}>
            <EuiModalHeader>
              <EuiModalHeaderTitle>
                {i18n.translate('workchatApp.assistants.editBasicInfo.title', {
                  defaultMessage: 'Edit assistant basic info',
                })}
              </EuiModalHeaderTitle>
            </EuiModalHeader>

            <EuiModalBody>
              <EuiForm component="form" onSubmit={handleSubmit} fullWidth>
                <EuiFormRow
                  label={i18n.translate('workchatApp.assistants.editBasicInfo.nameLabel', {
                    defaultMessage: 'Name',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="assistantNameInput"
                    value={editState.name || ''}
                    onChange={handleNameChange}
                    fullWidth
                  />
                </EuiFormRow>

                <EuiFormRow
                  label={i18n.translate('workchatApp.assistants.editBasicInfo.descriptionLabel', {
                    defaultMessage: 'Description',
                  })}
                  fullWidth
                >
                  <EuiTextArea
                    data-test-subj="assistantDescriptionInput"
                    value={editState.description || ''}
                    onChange={handleDescriptionChange}
                    rows={3}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButtonEmpty data-test-subj="cancelBasicInfoButton" onClick={onCancel}>
                {i18n.translate('workchatApp.assistants.editBasicInfo.cancelButtonLabel', {
                  defaultMessage: 'Cancel',
                })}
              </EuiButtonEmpty>

              <EuiButton
                data-test-subj="saveBasicInfoButton"
                fill
                onClick={handleSubmit}
                isLoading={isSubmitting}
              >
                {i18n.translate('workchatApp.assistants.editBasicInfo.saveButtonLabel', {
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
