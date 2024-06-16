/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSteps,
  EuiFormRow,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useFormContext, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { ActionConnector } from '../../../common/types/domain';
import type { CasePostRequest } from '../../../common/types/api';
import { Title } from '../case_form_fields/title';
import { Description, fieldName as descriptionFieldName } from '../case_form_fields/description';
import { Tags } from '../case_form_fields/tags';
import { Connector } from '../case_form_fields/connector';
import * as i18n from './translations';
import { SyncAlertsToggle } from '../case_form_fields/sync_alerts_toggle';
import type {
  CasesConfigurationUI,
  CasesConfigurationUITemplate,
  CaseUI,
  CaseUICustomField,
} from '../../containers/types';
import type { CasesTimelineIntegration } from '../timeline_context';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { InsertTimeline } from '../insert_timeline';
import { removeEmptyFields, removeItemFromSessionStorage } from '../utils';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import { SubmitCaseButton } from './submit_button';
import { FormContext, initialCaseValue } from './form_context';
import { useCasesFeatures } from '../../common/use_cases_features';
import { CreateCaseOwnerSelector } from './owner_selector';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import type { CaseAttachmentsWithoutOwner } from '../../types';
import { Severity } from '../case_form_fields/severity';
import { Assignees } from '../case_form_fields/assignees';
import { useCancelCreationAction } from './use_cancel_creation_action';
import { CancelCreationConfirmationModal } from './cancel_creation_confirmation_modal';
import { Category } from '../case_form_fields/category';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { TemplateSelector } from './templates';
import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';
import { getConfigurationByOwner } from '../../containers/configure/utils';
import { CustomFields } from '../case_form_fields/custom_fields';
import type { CreateCaseFormSchema } from './schema';

export interface CreateCaseFormFieldsProps {
  configurations: CasesConfigurationUI[];
  connectors: ActionConnector[];
  isLoading: boolean;
  withSteps: boolean;
  draftStorageKey: string;
}

type CaseUICustomFieldWithNoNullValues = CaseUICustomField & {
  value: NonNullable<CaseUICustomField['value']>;
};

const transformTemplateCaseFieldsToCaseFormFields = (
  caseTemplateFields: CasesConfigurationUITemplate['caseFields']
): Partial<CreateCaseFormSchema> => {
  const customFields = Object.fromEntries(
    caseTemplateFields?.customFields
      ?.filter(
        (customField): customField is CaseUICustomFieldWithNoNullValues => customField.value != null
      )
      .map((customField) => [customField.key, customField.value]) ?? []
  );

  const caseFields = removeEmptyFields({
    title: caseTemplateFields?.title,
    assignees: caseTemplateFields?.assignees,
    tags: caseTemplateFields?.tags,
    category: caseTemplateFields?.category,
    severity: caseTemplateFields?.severity,
    description: caseTemplateFields?.description,
    connectorId: caseTemplateFields?.connector?.id,
    customFields,
  });

  return {
    ...caseFields,
    ...(caseTemplateFields?.connector?.id != null && caseTemplateFields?.connector?.fields != null
      ? { fields: caseTemplateFields?.connector?.fields }
      : {}),
  };
};

export interface CreateCaseFormProps extends Pick<Partial<CreateCaseFormFieldsProps>, 'withSteps'> {
  onCancel: () => void;
  onSuccess: (theCase: CaseUI) => void;
  afterCaseCreated?: (
    theCase: CaseUI,
    createAttachments: UseCreateAttachments['mutate']
  ) => Promise<void>;
  timelineIntegration?: CasesTimelineIntegration;
  attachments?: CaseAttachmentsWithoutOwner;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
}

export const CreateCaseFormFields: React.FC<CreateCaseFormFieldsProps> = React.memo(
  ({ configurations, connectors, isLoading, withSteps, draftStorageKey }) => {
    const { owner } = useCasesContext();
    const [{ selectedOwner }] = useFormData<{ selectedOwner: string }>({
      watch: ['selectedOwner'],
    });

    const configurationOwner: string | undefined = selectedOwner ? selectedOwner : owner[0];

    const configuration = useMemo(
      () =>
        getConfigurationByOwner({
          configurations,
          owner: configurationOwner,
        }),
      [configurations, configurationOwner]
    );

    const { reset, updateFieldValues, isSubmitting } = useFormContext();
    const { isSyncAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();
    const availableOwners = useAvailableCasesOwners();
    const canShowCaseSolutionSelection = !owner.length && availableOwners.length > 1;

    const onTemplateChange = useCallback(
      (caseFields: CasesConfigurationUITemplate['caseFields']) => {
        const caseFormFields = transformTemplateCaseFieldsToCaseFormFields(caseFields);
        reset({ resetValues: true, defaultValue: initialCaseValue });
        updateFieldValues(caseFormFields);
      },
      [reset, updateFieldValues]
    );

    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <TemplateSelector
            isLoading={isSubmitting || isLoading}
            templates={configuration.templates}
            onTemplateChange={onTemplateChange}
          />
        ),
      }),
      [configuration.templates, isLoading, isSubmitting, onTemplateChange]
    );

    const secondStep = useMemo(
      () => ({
        title: i18n.STEP_TWO_TITLE,
        children: (
          <>
            <Title isLoading={isSubmitting} autoFocus={true} />
            {caseAssignmentAuthorized ? <Assignees isLoading={isSubmitting} /> : null}
            <Tags isLoading={isSubmitting} />
            <Category isLoading={isSubmitting} />
            <Severity isLoading={isSubmitting} />
            {canShowCaseSolutionSelection && (
              <CreateCaseOwnerSelector
                availableOwners={availableOwners}
                isLoading={isSubmitting || isLoading}
              />
            )}
            <Description isLoading={isSubmitting} draftStorageKey={draftStorageKey} />
            <CustomFields
              isLoading={isSubmitting || isLoading}
              configurationCustomFields={configuration.customFields}
            />
          </>
        ),
      }),
      [
        isSubmitting,
        caseAssignmentAuthorized,
        canShowCaseSolutionSelection,
        availableOwners,
        isLoading,
        draftStorageKey,
        configuration.customFields,
      ]
    );

    const thirdStep = useMemo(
      () => ({
        title: i18n.STEP_THREE_TITLE,
        children: <SyncAlertsToggle isLoading={isSubmitting} />,
      }),
      [isSubmitting]
    );

    const fourthStep = useMemo(
      () => ({
        title: i18n.STEP_FOUR_TITLE,
        children: (
          <Connector
            connectors={connectors}
            isLoadingConnectors={isLoading}
            isLoading={isSubmitting}
            configurationConnector={configuration.connector}
          />
        ),
      }),
      [configuration.connector, connectors, isLoading, isSubmitting]
    );

    const allSteps = useMemo(
      () => [
        ...(canShowCaseSolutionSelection ? [firstStep] : []),
        firstStep,
        secondStep,
        ...(isSyncAlertsEnabled ? [thirdStep] : []),
        fourthStep,
      ],
      [
        canShowCaseSolutionSelection,
        firstStep,
        secondStep,
        isSyncAlertsEnabled,
        thirdStep,
        fourthStep,
      ]
    );

    return (
      <>
        {isSubmitting && (
          <EuiLoadingSpinner
            css={css`
              position: absolute;
              top: 50%;
              left: 50%;
              z-index: 99;
            `}
            data-test-subj="create-case-loading-spinner"
            size="xl"
          />
        )}
        {withSteps ? (
          <EuiSteps
            headingElement="h2"
            steps={allSteps}
            data-test-subj={'case-creation-form-steps'}
          />
        ) : (
          <>
            {!canShowCaseSolutionSelection ? firstStep.children : null}
            {secondStep.children}
            {isSyncAlertsEnabled && thirdStep.children}
            {fourthStep.children}
          </>
        )}
      </>
    );
  }
);

CreateCaseFormFields.displayName = 'CreateCaseFormFields';

export const CreateCaseForm: React.FC<CreateCaseFormProps> = React.memo(
  ({
    withSteps = true,
    afterCaseCreated,
    onCancel,
    onSuccess,
    timelineIntegration,
    attachments,
    initialValue,
  }) => {
    const { owner } = useCasesContext();

    const { data: connectors = [], isLoading: isLoadingConnectors } =
      useGetSupportedActionConnectors();

    const { data: configurations, isLoading: isLoadingCaseConfiguration } =
      useGetAllCaseConfigurations();

    const draftStorageKey = getMarkdownEditorStorageKey({
      appId: owner[0],
      caseId: 'createCase',
      commentId: 'description',
    });

    const handleOnConfirmationCallback = (): void => {
      onCancel();
      removeItemFromSessionStorage(draftStorageKey);
    };

    const { showConfirmationModal, onOpenModal, onConfirmModal, onCancelModal } =
      useCancelCreationAction({
        onConfirmationCallback: handleOnConfirmationCallback,
      });

    const handleOnSuccess = (theCase: CaseUI): void => {
      removeItemFromSessionStorage(draftStorageKey);
      return onSuccess(theCase);
    };

    return (
      <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
        <FormContext
          afterCaseCreated={afterCaseCreated}
          onSuccess={handleOnSuccess}
          attachments={attachments}
          initialValue={initialValue}
        >
          <CreateCaseFormFields
            connectors={connectors}
            isLoading={isLoadingConnectors || isLoadingCaseConfiguration}
            withSteps={withSteps}
            draftStorageKey={draftStorageKey}
            configurations={configurations}
          />
          <EuiFormRow fullWidth>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="flexEnd"
              gutterSize="l"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="create-case-cancel"
                  iconType="cross"
                  onClick={onOpenModal}
                  size="s"
                >
                  {i18n.CANCEL}
                </EuiButtonEmpty>
                {showConfirmationModal && (
                  <CancelCreationConfirmationModal
                    title={i18n.MODAL_TITLE}
                    onConfirm={onConfirmModal}
                    onCancel={onCancelModal}
                  />
                )}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SubmitCaseButton />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
          <InsertTimeline fieldName={descriptionFieldName} />
        </FormContext>
      </CasesTimelineIntegrationProvider>
    );
  }
);

CreateCaseForm.displayName = 'CreateCaseForm';
