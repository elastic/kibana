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

import { useFormContext } from '../../common/shared_imports';

import { Title } from './title';
import { Description, fieldName as descriptionFieldName } from './description';
import { Tags } from './tags';
import { Connector } from './connector';
import * as i18n from './translations';
import { SyncAlertsToggle } from './sync_alerts_toggle';
import { ActionConnector, CaseType } from '../../../common';
import { Case } from '../../containers/types';
import { CasesTimelineIntegration, CasesTimelineIntegrationProvider } from '../timeline_context';
import { InsertTimeline } from '../insert_timeline';
import { UsePostComment } from '../../containers/use_post_comment';
import { SubmitCaseButton } from './submit_button';
import { FormContext } from './form_context';

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
  disableAlerts: boolean;
  hideConnectorServiceNowSir: boolean;
  withSteps: boolean;
}
export interface CreateCaseFormProps
  extends Pick<
    Partial<CreateCaseFormFieldsProps>,
    'disableAlerts' | 'hideConnectorServiceNowSir' | 'withSteps'
  > {
  onCancel: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  afterCaseCreated?: (theCase: Case, postComment: UsePostComment['postComment']) => Promise<void>;
  caseType?: CaseType;
  timelineIntegration?: CasesTimelineIntegration;
}

const empty: ActionConnector[] = [];
export const CreateCaseFormFields: React.FC<CreateCaseFormFieldsProps> = React.memo(
  ({ connectors, disableAlerts, isLoadingConnectors, hideConnectorServiceNowSir, withSteps }) => {
    const { isSubmitting } = useFormContext();
    const firstStep = useMemo(
      () => ({
        title: i18n.STEP_ONE_TITLE,
        children: (
          <>
            <Title isLoading={isSubmitting} />
            <Container>
              <Tags isLoading={isSubmitting} />
            </Container>
            <Container big>
              <Description isLoading={isSubmitting} />
            </Container>
          </>
        ),
      }),
      [isSubmitting]
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
              hideConnectorServiceNowSir={hideConnectorServiceNowSir}
              isLoadingConnectors={isLoadingConnectors}
              isLoading={isSubmitting}
            />
          </Container>
        ),
      }),
      [connectors, hideConnectorServiceNowSir, isLoadingConnectors, isSubmitting]
    );

    const allSteps = useMemo(
      () => [firstStep, ...(!disableAlerts ? [secondStep] : []), thirdStep],
      [disableAlerts, firstStep, secondStep, thirdStep]
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
            {!disableAlerts && secondStep.children}
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
    disableAlerts = false,
    hideConnectorServiceNowSir = false,
    withSteps = true,
    afterCaseCreated,
    caseType,
    onCancel,
    onSuccess,
    timelineIntegration,
  }) => (
    <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
      <FormContext
        afterCaseCreated={afterCaseCreated}
        caseType={caseType}
        hideConnectorServiceNowSir={hideConnectorServiceNowSir}
        onSuccess={onSuccess}
        // if we are disabling alerts, then we should not sync alerts
        syncAlertsDefaultValue={!disableAlerts}
      >
        <CreateCaseFormFields
          connectors={empty}
          disableAlerts={disableAlerts}
          isLoadingConnectors={false}
          hideConnectorServiceNowSir={hideConnectorServiceNowSir}
          withSteps={withSteps}
        />
        <Container>
          <EuiFlexGroup
            alignItems="center"
            justifyContent="flexEnd"
            gutterSize="xs"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="create-case-cancel"
                iconType="cross"
                onClick={onCancel}
                size="s"
              >
                {i18n.CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SubmitCaseButton />
            </EuiFlexItem>
          </EuiFlexGroup>
        </Container>
        <InsertTimeline fieldName={descriptionFieldName} />
      </FormContext>
    </CasesTimelineIntegrationProvider>
  )
);

CreateCaseForm.displayName = 'CreateCaseForm';
