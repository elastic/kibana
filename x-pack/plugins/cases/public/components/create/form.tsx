/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSteps,
  useEuiTheme,
  logicalCSS,
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
import type { CasesConfigurationUI, CaseUI } from '../../containers/types';
import type { CasesTimelineIntegration } from '../timeline_context';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { InsertTimeline } from '../insert_timeline';
import { removeItemFromSessionStorage } from '../utils';
import type { UseCreateAttachments } from '../../containers/use_create_attachments';
import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import { SubmitCaseButton } from './submit_button';
import { FormContext } from './form_context';
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

const containerCss = (euiTheme: EuiThemeComputed<{}>, big?: boolean) =>
  big
    ? css`
        ${logicalCSS('margin-top', euiTheme.size.xl)};
      `
    : css`
        ${logicalCSS('margin-top', euiTheme.size.base)};
      `;

export interface CreateCaseFormFieldsProps {
  configurations: CasesConfigurationUI[];
  connectors: ActionConnector[];
  isLoading: boolean;
  withSteps: boolean;
  draftStorageKey: string;
}

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

    const { isSubmitting } = useFormContext();
    const { isSyncAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();
    const { euiTheme } = useEuiTheme();
    const availableOwners = useAvailableCasesOwners();
    const canShowCaseSolutionSelection = !owner.length && availableOwners.length > 1;

    const onTemplateChange = useCallback(() => {}, []);

    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <div>
            <TemplateSelector
              isLoading={isSubmitting || isLoading}
              templates={configuration.templates}
              onTemplateChange={onTemplateChange}
            />
          </div>
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
            {caseAssignmentAuthorized ? (
              <div css={containerCss(euiTheme)}>
                <Assignees isLoading={isSubmitting} />
              </div>
            ) : null}
            <div css={containerCss(euiTheme)}>
              <Tags isLoading={isSubmitting} />
            </div>
            <div css={containerCss(euiTheme)}>
              <Category isLoading={isSubmitting} />
            </div>
            <div css={containerCss(euiTheme)}>
              <Severity isLoading={isSubmitting} />
            </div>
            {canShowCaseSolutionSelection && (
              <div css={containerCss(euiTheme, true)}>
                <CreateCaseOwnerSelector
                  availableOwners={availableOwners}
                  isLoading={isSubmitting || isLoading}
                />
              </div>
            )}
            <div css={containerCss(euiTheme, true)}>
              <Description isLoading={isSubmitting} draftStorageKey={draftStorageKey} />
            </div>
            <div css={containerCss(euiTheme)}>
              <CustomFields
                isLoading={isSubmitting || isLoading}
                configurationCustomFields={configuration.customFields}
              />
            </div>
            <div css={containerCss(euiTheme)} />
          </>
        ),
      }),
      [
        isSubmitting,
        caseAssignmentAuthorized,
        euiTheme,
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
        children: (
          <div>
            <SyncAlertsToggle isLoading={isSubmitting} />
          </div>
        ),
      }),
      [isSubmitting]
    );

    const fourthStep = useMemo(
      () => ({
        title: i18n.STEP_FOUR_TITLE,
        children: (
          <div>
            <Connector
              connectors={connectors}
              isLoadingConnectors={isLoading}
              isLoading={isSubmitting}
            />
          </div>
        ),
      }),
      [connectors, isLoading, isSubmitting]
    );

    const allSteps = useMemo(
      () => [firstStep, secondStep, ...(isSyncAlertsEnabled ? [thirdStep] : []), fourthStep],
      [firstStep, isSyncAlertsEnabled, secondStep, thirdStep, fourthStep]
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
            {firstStep.children}
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
          <div>
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
          </div>
          <InsertTimeline fieldName={descriptionFieldName} />
        </FormContext>
      </CasesTimelineIntegrationProvider>
    );
  }
);

CreateCaseForm.displayName = 'CreateCaseForm';
