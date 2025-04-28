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
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { IntegrationType } from '@kbn/wci-common';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { useNavigation } from '../../../hooks/use_navigation';
import { useKibana } from '../../../hooks/use_kibana';
import { useBreadcrumb } from '../../../hooks/use_breadcrumbs';
import { IntegrationEditState, useIntegrationEdit } from '../../../hooks/use_integration_edit';
import { useIntegrationDelete } from '../../../hooks/use_integration_delete';
import { useIntegrationConfigurationForm } from '../../../hooks/use_integration_configuration_form';
import { appPaths } from '../../../app_paths';
import { integrationLabels } from '../i18n';
import { integrationTypeToLabel } from '../utils';

interface IntegrationEditViewProps {
  integrationId: string | undefined;
}

export const IntegrationEditView: React.FC<IntegrationEditViewProps> = ({ integrationId }) => {
  const { navigateToWorkchatUrl } = useNavigation();
  const {
    services: { notifications },
  } = useKibana();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const breadcrumb = useMemo(() => {
    return [
      { text: integrationLabels.breadcrumb.integrationsPill, path: appPaths.integrations.list },
      integrationId
        ? { text: integrationLabels.breadcrumb.editIntegrationPill }
        : { text: integrationLabels.breadcrumb.createIntegrationPill },
    ];
  }, [integrationId]);

  useBreadcrumb(breadcrumb);

  const handleCancel = useCallback(() => {
    navigateToWorkchatUrl(appPaths.integrations.catalog);
  }, [navigateToWorkchatUrl]);

  const onSaveSuccess = useCallback(() => {
    notifications.toasts.addSuccess(
      integrationId
        ? integrationLabels.notifications.integrationUpdatedToastText
        : integrationLabels.notifications.integrationCreatedToastText
    );
    navigateToWorkchatUrl(appPaths.integrations.list);
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
    ...Object.values(IntegrationType).map((type) => ({
      value: type,
      text: integrationTypeToLabel(type),
    })),
  ];

  const onDeleteSuccess = useCallback(() => {
    notifications.toasts.addSuccess(integrationLabels.notifications.integrationDeletedToastText);
    navigateToWorkchatUrl(appPaths.integrations.list);
  }, [navigateToWorkchatUrl, notifications]);

  const onDeleteError = useCallback(
    (err: Error) => {
      notifications.toasts.addError(err, {
        title: 'Error deleting integration',
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
          integrationId
            ? integrationLabels.editView.editIntegrationTitle
            : integrationLabels.editView.createIntegrationTitle
        }
      />

      <KibanaPageTemplate.Section grow={false} paddingSize="m">
        <EuiPanel hasShadow={false} hasBorder={true}>
          <FormProvider {...formMethods}>
            <EuiForm component="form" fullWidth onSubmit={handleSubmit((data) => submit(data))}>
              <EuiDescribedFormGroup
                ratio="third"
                title={<h3>Base configuration</h3>}
                description="Configure your integration"
              >
                <EuiFormRow label="Name">
                  <Controller
                    rules={{ required: true }}
                    name="name"
                    control={control}
                    render={({ field }) => (
                      <EuiFieldText
                        data-test-subj="workchatAppIntegrationEditViewFieldText"
                        {...field}
                      />
                    )}
                  />
                </EuiFormRow>
                <EuiFormRow label="Description">
                  <Controller
                    rules={{ required: true }}
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <EuiFieldText
                        data-test-subj="workchatAppIntegrationEditViewFieldText"
                        {...field}
                      />
                    )}
                  />
                </EuiFormRow>
                <EuiFormRow label="Type">
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
                        {integrationLabels.editView.cancelButtonLabel}
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
                    {integrationLabels.editView.saveButtonLabel}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiForm>

            {isDeleteModalVisible && (
              <EuiConfirmModal
                title="Delete integration"
                onCancel={closeDeleteModal}
                onConfirm={handleDelete}
                cancelButtonText="Cancel"
                confirmButtonText="Delete"
                buttonColor="danger"
                defaultFocusedButton="confirm"
              >
                <p>
                  Are you sure you want to delete this integration? This action cannot be undone.
                </p>
              </EuiConfirmModal>
            )}
          </FormProvider>
        </EuiPanel>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
