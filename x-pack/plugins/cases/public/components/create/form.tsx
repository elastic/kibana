/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSteps,
} from '@elastic/eui';
import styled, { css } from 'styled-components';

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { Title } from './title';
import { Description, fieldName as descriptionFieldName } from './description';
import { Tags } from './tags';
import { Connector } from './connector';
import * as i18n from './translations';
import { SyncAlertsToggle } from './sync_alerts_toggle';
import type { ActionConnector, CasePostRequest } from '../../../common/api';
import type { Case } from '../../containers/types';
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
import { Severity } from './severity';
import { Assignees } from './assignees';
import { useCancelCreationAction } from './use_cancel_creation_action';
import { CancelCreationConfirmationModal } from './cancel_creation_confirmation_modal';

interface ContainerProps {
  big?: boolean;
}

const Container = styled.div.attrs((props) => props)<ContainerProps>`
  ${({ big, theme }) => css`
    margin-top: ${big ? theme.eui?.euiSizeXL ?? '32px' : theme.eui?.euiSize ?? '16px'};
  `}
`;

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 99;
`;

export interface CreateCaseFormFieldsProps {
  connectors: ActionConnector[];
  isLoadingConnectors: boolean;
  withSteps: boolean;
  owner: string[];
  draftStorageKey: string;
}
export interface CreateCaseFormProps extends Pick<Partial<CreateCaseFormFieldsProps>, 'withSteps'> {
  onCancel: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  afterCaseCreated?: (
    theCase: Case,
    createAttachments: UseCreateAttachments['createAttachments']
  ) => Promise<void>;
  timelineIntegration?: CasesTimelineIntegration;
  attachments?: CaseAttachmentsWithoutOwner;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
}

const empty: ActionConnector[] = [];
export const CreateCaseFormFields: React.FC<CreateCaseFormFieldsProps> = React.memo(
  ({ connectors, isLoadingConnectors, withSteps, owner, draftStorageKey }) => {
    const { isSubmitting } = useFormContext();
    const { isSyncAlertsEnabled, caseAssignmentAuthorized } = useCasesFeatures();

    const availableOwners = useAvailableCasesOwners();
    const canShowCaseSolutionSelection = !owner.length && availableOwners.length;

    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <>
            <Title isLoading={isSubmitting} />
            {caseAssignmentAuthorized ? (
              <Container>
                <Assignees isLoading={isSubmitting} />
              </Container>
            ) : null}
            <Container>
              <Tags isLoading={isSubmitting} />
            </Container>
            <Container>
              <Severity isLoading={isSubmitting} />
            </Container>
            {canShowCaseSolutionSelection && (
              <Container big>
                <CreateCaseOwnerSelector
                  availableOwners={availableOwners}
                  isLoading={isSubmitting}
                />
              </Container>
            )}
            <Container big>
              <Description isLoading={isSubmitting} draftStorageKey={draftStorageKey} />
            </Container>
            <Container />
          </>
        ),
      }),
      [
        isSubmitting,
        caseAssignmentAuthorized,
        canShowCaseSolutionSelection,
        availableOwners,
        draftStorageKey,
      ]
    );

    const secondStep = useMemo(
      () => ({
        title: i18n.STEP_TWO_TITLE,
        children: (
          <Container>
            <SyncAlertsToggle isLoading={isSubmitting} />
          </Container>
        ),
      }),
      [isSubmitting]
    );

    const thirdStep = useMemo(
      () => ({
        title: i18n.STEP_THREE_TITLE,
        children: (
          <Container>
            <Connector
              connectors={connectors}
              isLoadingConnectors={isLoadingConnectors}
              isLoading={isSubmitting}
            />
          </Container>
        ),
      }),
      [connectors, isLoadingConnectors, isSubmitting]
    );

    const allSteps = useMemo(
      () => [firstStep, ...(isSyncAlertsEnabled ? [secondStep] : []), thirdStep],
      [isSyncAlertsEnabled, firstStep, secondStep, thirdStep]
    );

    return (
      <>
        {isSubmitting && <MySpinner data-test-subj="create-case-loading-spinner" size="xl" />}
        {withSteps ? (
          <EuiSteps
            headingElement="h2"
            steps={allSteps}
            data-test-subj={'case-creation-form-steps'}
          />
        ) : (
          <>
            {firstStep.children}
            {isSyncAlertsEnabled && secondStep.children}
            {thirdStep.children}
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
    const { owner, appId } = useCasesContext();
    const draftStorageKey = getMarkdownEditorStorageKey(appId, 'createCase', 'description');

    const handleOnConfirmationCallback = (): void => {
      onCancel();
      removeItemFromSessionStorage(draftStorageKey);
    };

    const { showConfirmationModal, onOpenModal, onConfirmModal, onCancelModal } =
      useCancelCreationAction({
        onConfirmationCallback: handleOnConfirmationCallback,
      });

    const handleOnSuccess = (theCase: Case): Promise<void> => {
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
            connectors={empty}
            isLoadingConnectors={false}
            withSteps={withSteps}
            owner={owner}
            draftStorageKey={draftStorageKey}
          />
          <Container>
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
          </Container>
          <InsertTimeline fieldName={descriptionFieldName} />
        </FormContext>
      </CasesTimelineIntegrationProvider>
    );
  }
);

CreateCaseForm.displayName = 'CreateCaseForm';
