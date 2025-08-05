/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiPanel,
  EuiFlexItem,
  EuiSpacer,
  EuiForm,
  EuiFormRow,
  EuiDescribedFormGroup,
  EuiSelect,
  EuiConfirmModal,
  EuiButtonEmpty,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType } from '@kbn/wci-common';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { useNavigation } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';
import { useBreadcrumb } from '../../../hooks/use_breadcrumbs';
import { IntegrationEditState, useIntegrationEdit } from '../../../hooks/use_integration_edit';
import { useIntegrationDelete } from '../../../hooks/use_integration_delete';
import { useIntegrationConfigurationForm } from '../../../hooks/use_integration_configuration_form';
import { appPaths } from '../../../app_paths';
import { toolLabels } from '../i18n';
import { integrationTypeToLabel, isIntegrationDisabled } from '../utils';

interface IntegrationEditViewProps {
  integrationId: string | undefined;
}

export const IntegrationEditView: React.FC<IntegrationEditViewProps> = ({ integrationId }) => {
  const confirmModalTitleId = useGeneratedHtmlId();
  const { navigateToWorkchatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const breadcrumb = useMemo(() => {
    return [
      { text: toolLabels.breadcrumb.toolsPill, path: appPaths.tools.list },
      integrationId
        ? { text: toolLabels.editView.editToolTitle }
        : { text: toolLabels.editView.createToolTitle },
    ];
  }, [integrationId]);

  useBreadcrumb(breadcrumb);

  const handleCancel = useCallback(() => {
    navigateToWorkchatUrl(appPaths.tools.catalog);
  }, [navigateToWorkchatUrl]);

  const onSaveSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      integrationId
        ? toolLabels.notifications.toolUpdatedToastText
        : toolLabels.notifications.toolCreatedToastText
    );
    navigateToWorkchatUrl(appPaths.tools.list);
  }, [integrationId, navigateToWorkchatUrl, notifications]);

  const onSaveError = useCallback(
    (err: Error) => {
      notifications.toasts.addError(err, {
        title: 'Error',
      });
    },
    [notifications]
  );

  const { state, submit } = useIntegrationEdit({
    integrationId,
    onSaveSuccess,
    onSaveError,
  });

  const integrationTypes = [
    { value: '', text: 'Pick a type' },
    ...Object.values(IntegrationType)
      .filter((type) => !isIntegrationDisabled(type))
      .map((type) => ({
        value: type,
        text: integrationTypeToLabel(type),
      })),
  ];

  const onDeleteSuccess = useCallback(() => {
    notifications.toasts.addSuccess(toolLabels.notifications.toolDeletedToastText);
    navigateToWorkchatUrl(appPaths.tools.list);
  }, [navigateToWorkchatUrl, notifications]);

  const onDeleteError = useCallback(
    (err: Error) => {
      notifications.toasts.addError(err, {
        title: 'Error deleting tool',
      });
    },
    [notifications]
  );

  const { deleteIntegration, isDeleting } = useIntegrationDelete({
    onDeleteSuccess,
    onDeleteError,
  });

  const handleDelete = useCallback(() => {
    if (integrationId) {
      deleteIntegration(integrationId);
    }
    setIsDeleteModalVisible(false);
  }, [deleteIntegration, integrationId]);

  const showDeleteModal = () => {
    setIsDeleteModalVisible(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalVisible(false);
  };

  const params = new URLSearchParams(location.search);
  const type = params.get('type');

  const formMethods = useForm<IntegrationEditState>({
    values: {
      ...state,
      type: type || state.type,
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    control,
    watch,
  } = formMethods;

  const ConfigurationForm = useIntegrationConfigurationForm(watch('type'));

  return (
    <KibanaPageTemplate panelled>
      <KibanaPageTemplate.Header
        pageTitle={
          integrationId ? toolLabels.editView.editToolTitle : toolLabels.editView.createToolTitle
        }
      />

      <KibanaPageTemplate.Section grow={false} paddingSize="m">
        <EuiPanel hasShadow={false} hasBorder={true}>
          <FormProvider {...formMethods}>
            <EuiForm component="form" fullWidth onSubmit={handleSubmit((data) => submit(data))}>
              <EuiDescribedFormGroup
                ratio="third"
                title={<h3>{toolLabels.editView.baseConfigurationTitle}</h3>}
                description={toolLabels.editView.baseConfigurationDescription}
              >
                <EuiFormRow
                  label={toolLabels.editView.nameLabel}
                  isInvalid={!!formMethods.formState.errors.name}
                  error={
                    formMethods.formState.errors.name ? toolLabels.editView.nameRequired : undefined
                  }
                >
                  <Controller
                    rules={{ required: toolLabels.editView.nameRequired }}
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <EuiFieldText
                        data-test-subj="workchatAppIntegrationEditViewFieldText"
                        isInvalid={!!formMethods.formState.errors.name}
                        {...field}
                      />
                    )}
                  />
                </EuiFormRow>
                <EuiFormRow
                  label={toolLabels.editView.descriptionLabel}
                  isInvalid={!!formMethods.formState.errors.description}
                  error={
                    formMethods.formState.errors.description
                      ? toolLabels.editView.descriptionRequired
                      : undefined
                  }
                >
                  <Controller
                    rules={{ required: toolLabels.editView.descriptionRequired }}
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <EuiTextArea
                        data-test-subj="workchatAppIntegrationEditViewFieldText"
                        rows={3}
                        isInvalid={!!formMethods.formState.errors.description}
                        {...field}
                      />
                    )}
                  />
                </EuiFormRow>
                <EuiFormRow label={toolLabels.editView.typeLabel}>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <EuiSelect
                        data-test-subj="workchatAppIntegrationEditViewSelect"
                        options={integrationTypes}
                        {...field}
                        disabled={!!integrationId}
                      />
                    )}
                  />
                </EuiFormRow>
              </EuiDescribedFormGroup>

              <EuiSpacer />

              {ConfigurationForm && <ConfigurationForm form={formMethods} />}

              <EuiSpacer />

              <EuiFlexGroup justifyContent="spaceBetween">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup>
                    <EuiFlexItem>
                      <EuiButton
                        data-test-subj="workchatAppIntegrationEditViewCancelButton"
                        type="button"
                        iconType="framePrevious"
                        color="warning"
                        onClick={handleCancel}
                      >
                        {toolLabels.editView.cancelButtonLabel}
                      </EuiButton>
                    </EuiFlexItem>
                    {integrationId && (
                      <EuiFlexItem>
                        <EuiButtonEmpty
                          data-test-subj="workchatAppIntegrationEditViewDeleteButton"
                          color="danger"
                          onClick={showDeleteModal}
                          isLoading={isDeleting}
                        >
                          Delete
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="workchatAppIntegrationEditViewSaveButton"
                    type="submit"
                    iconType="save"
                    fill
                    disabled={isSubmitting}
                  >
                    {toolLabels.editView.saveButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>

            {isDeleteModalVisible && (
              <EuiConfirmModal
                aria-labelledby={confirmModalTitleId}
                title={toolLabels.editView.deleteModalTitle}
                titleProps={{ id: confirmModalTitleId }}
                onCancel={closeDeleteModal}
                onConfirm={handleDelete}
                cancelButtonText={toolLabels.editView.cancelButtonLabel}
                confirmButtonText={toolLabels.editView.deleteButtonLabel}
                buttonColor="danger"
                defaultFocusedButton="confirm"
              >
                <p>
                  {i18n.translate('workchatApp.integrations.editView.deleteMessage', {
                    defaultMessage:
                      'Are you sure you want to delete this tool? This action cannot be undone.',
                  })}
                </p>
              </EuiConfirmModal>
            )}
          </FormProvider>
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
