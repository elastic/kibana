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
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlind } from '@elastic/eui';
import { useKibana } from '../../../hooks/use_kibana';
import { useAgentEdition } from '../../../hooks/use_agent_edition';
import { assistantLabels } from '../i18n';

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
  const modalTitleId = useGeneratedHtmlId();

  const {
    services: { notifications },
  } = useKibana();

  const { state, submit, isSubmitting } = useAgentEdition({
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

  const { control, handleSubmit, watch } = useForm({
    values: state,
  });

  // Get form values for the avatar preview
  const name = watch('name');
  const avatarCustomText = watch('avatarCustomText');
  const avatarColor = watch('avatarColor');

  return (
    <EuiModal onClose={onClose} style={{ width: 800 }} aria-labelledby={modalTitleId}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('workchatApp.assistants.editBasicsModal.title', {
            defaultMessage: 'Edit Assistant Basics',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiForm component="form" onSubmit={handleSubmit((data) => submit(data))} fullWidth>
          <EuiText>
            <h4>
              {i18n.translate('workchatApp.assistants.editBasicsModal.identificationSection', {
                defaultMessage: 'Identification',
              })}
            </h4>
          </EuiText>

          <EuiSpacer size="m" />

          <Controller
            name="name"
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('workchatApp.assistants.editBasicsModal.nameLabel', {
                  defaultMessage: 'Name',
                })}
                fullWidth
              >
                <EuiFieldText data-test-subj="assistantNameInput" {...field} fullWidth />
              </EuiFormRow>
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={i18n.translate('workchatApp.assistants.editBasicsModal.descriptionLabel', {
                  defaultMessage: 'Description',
                })}
                fullWidth
              >
                <EuiTextArea
                  data-test-subj="assistantDescriptionInput"
                  {...field}
                  fullWidth
                  rows={6}
                />
              </EuiFormRow>
            )}
          />
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
              <EuiAvatar initials={avatarCustomText} name={name} color={avatarColor} size="xl" />
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <Controller
                    name="avatarColor"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <EuiFormRow
                        label={i18n.translate('workchatApp.assistants.editBasicsModal.colorLabel', {
                          defaultMessage: 'Color',
                        })}
                        fullWidth
                      >
                        <EuiColorPicker
                          data-test-subj="assistantAvatarColorPicker"
                          onChange={onChange}
                          color={value}
                          swatches={AVATAR_COLORS}
                        />
                      </EuiFormRow>
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <Controller
                    name="avatarCustomText"
                    control={control}
                    render={({ field }) => (
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
                          {...field}
                          fullWidth
                        />
                      </EuiFormRow>
                    )}
                  />
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
          onClick={handleSubmit((data) => submit(data))}
          isLoading={isSubmitting}
        >
          {assistantLabels.editView.saveButtonLabel}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
