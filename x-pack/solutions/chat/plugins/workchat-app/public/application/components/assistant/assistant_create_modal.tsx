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
import { useKibana } from '../../hooks/use_kibana';
import { useAgentEdition } from '../../hooks/use_agent_edition';
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

  const { editState, setFieldValue, submit, isSubmitting } = useAgentEdition({
    onSaveSuccess: (agent) => {
      notifications.toasts.addSuccess(
        i18n.translate('workchatApp.assistants.createSuccessMessage', {
          defaultMessage: 'Assistant created successfully',
        })
      );
      onClose();
      navigateToWorkchatUrl(appPaths.assistants.edit({ agentId: agent.id }));
    },
  });

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFieldValue('name', e.target.value);
    },
    [setFieldValue]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!editState.name.trim()) {
        notifications.toasts.addDanger(
          i18n.translate('workchatApp.assistants.create.nameRequiredError', {
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
    <EuiModal onClose={onClose} style={{ width: 640 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('workchatApp.assistants.create.title', {
            defaultMessage: 'Create new assistant',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm component="form" onSubmit={handleSubmit} fullWidth>
          <EuiFormRow
            label={i18n.translate('workchatApp.assistants.create.nameLabel', {
              defaultMessage: 'Name',
            })}
            fullWidth
          >
            <EuiFieldText
              data-test-subj="assistantNameInput"
              value={editState.name}
              onChange={handleNameChange}
              fullWidth
            />
          </EuiFormRow>
        </EuiForm>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          {assistantLabels.editView.cancelButtonLabel}
        </EuiButtonEmpty>

        <EuiButton
          data-test-subj="saveBasicInfoButton"
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
