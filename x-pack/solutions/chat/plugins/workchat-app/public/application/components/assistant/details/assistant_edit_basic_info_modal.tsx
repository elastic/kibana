import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTextArea,
  EuiColorPicker,
  EuiText,
  EuiFieldText,
  EuiFormHelpText,
  EuiAvatar,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { useAgentEdition } from '../../../hooks/use_agent_edition';
import { assistantLabels } from '../i18n';
import { euiPaletteColorBlind } from '@elastic/eui';

export interface EditAssistantBasicInfoProps {
  onClose: () => void;
  onSaveSuccess: () => void;
  agentId: string;
}

const AVATAR_COLORS = euiPaletteColorBlind();

export const EditAssistantBasicInfo: React.FC<EditAssistantBasicInfoProps> = ({
  onClose,
  agentId,
  onSaveSuccess,
}) => {
  const {
    services: { notifications },
  } = useKibana();

  const { editState, setFieldValue, submit, isSubmitting } = useAgentEdition({
    agentId,
    onSaveSuccess: () => {
      notifications.toasts.addSuccess(
        i18n.translate('workchatApp.assistants.editBasicsModal.saveSuccessMessage', {
          defaultMessage: 'Assistant updated successfully',
        })
      );
      onSaveSuccess();
      onClose();
    },
  });

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

  const handleAvatarColorChange = useCallback(
    (color: string) => {
      setFieldValue('avatarColor', color);
    },
    [setFieldValue]
  );

  const handleAvatarTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFieldValue('avatarCustomText', e.target.value);
    },
    [setFieldValue]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!editState.name.trim()) {
        notifications.toasts.addDanger(
          i18n.translate('workchatApp.assistants.editBasicsModal.nameRequiredError', {
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
    <EuiModal onClose={onClose} style={{ width: 800 }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          {i18n.translate('workchatApp.assistants.editBasicsModal.title', {
            defaultMessage: 'Edit Assistant Basics',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm component="form" onSubmit={handleSubmit} fullWidth>
          <EuiText>
            <h4>
              {i18n.translate('workchatApp.assistants.editBasicsModal.identificationSection', {
                defaultMessage: 'Identification',
              })}
            </h4>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiFormRow
            label={i18n.translate('workchatApp.assistants.editBasicsModal.nameLabel', {
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

          <EuiFormRow
            label={i18n.translate('workchatApp.assistants.editBasicsModal.descriptionLabel', {
              defaultMessage: 'Description',
            })}
            fullWidth
          >
            <EuiTextArea
              data-test-subj="assistantDescriptionInput"
              value={editState.description}
              onChange={handleDescriptionChange}
              fullWidth
              rows={6}
            />
          </EuiFormRow>
          <EuiFormHelpText>
            {i18n.translate('workchatApp.assistants.editBasicsModal.descriptionHelpText', {
              defaultMessage: 'Describe what this assistant is going to be used for.',
            })}
          </EuiFormHelpText>

          <EuiSpacer size="l" />

          <EuiText>
            <h4>
              {i18n.translate('workchatApp.assistants.editBasicsModal.avatarSection', {
                defaultMessage: 'Avatar',
              })}
            </h4>
          </EuiText>

          <EuiSpacer size="m" />

          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiAvatar
                initials={editState.avatarCustomText}
                name={editState.name}
                color={editState.avatarColor}
                size="xl"
              />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('workchatApp.assistants.editBasicsModal.colorLabel', {
                      defaultMessage: 'Color',
                    })}
                    fullWidth
                  >
                    <EuiColorPicker
                      data-test-subj="assistantAvatarColorPicker"
                      onChange={handleAvatarColorChange}
                      color={editState.avatarColor}
                      swatches={AVATAR_COLORS}
                    />
                  </EuiFormRow>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiFormRow
                    label={i18n.translate('workchatApp.assistants.editBasicsModal.textLabel', {
                      defaultMessage: 'Custom Text',
                    })}
                    helpText={i18n.translate(
                      'workchatApp.assistants.editBasicsModal.emojiHelpText',
                      {
                        defaultMessage: 'Press CTRL + CMD + Space for emojis',
                      }
                    )}
                    fullWidth
                  >
                    <EuiFieldText
                      data-test-subj="assistantAvatarTextField"
                      value={editState.avatarCustomText}
                      onChange={handleAvatarTextChange}
                      fullWidth
                    />
                  </EuiFormRow>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
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
