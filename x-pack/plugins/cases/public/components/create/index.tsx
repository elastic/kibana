/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';

import { Field, getUseField } from '../../common/shared_imports';
import * as i18n from './translations';
import { CreateCaseForm } from './form';
import { FormContext } from './form_context';
import { SubmitCaseButton } from './submit_button';
import { Case } from '../../containers/types';
import { CaseType } from '../../../common/api/cases';
import { CasesTimelineIntegration, CasesTimelineIntegrationProvider } from '../timeline_context';
import { fieldName as descriptionFieldName } from './description';
import { InsertTimeline } from '../insert_timeline';
import { UsePostComment } from '../../containers/use_post_comment';

export const CommonUseField = getUseField({ component: Field });

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
  `}
`;

export interface CreateCaseProps {
  afterCaseCreated?: (theCase: Case, postComment: UsePostComment['postComment']) => Promise<void>;
  caseType?: CaseType;
  hideConnectorServiceNowSir?: boolean;
  onCancel: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  timelineIntegration?: CasesTimelineIntegration;
  withSteps?: boolean;
}

export const CreateCase = ({
  afterCaseCreated,
  caseType,
  hideConnectorServiceNowSir,
  onCancel,
  onSuccess,
  timelineIntegration,
  withSteps,
}: CreateCaseProps) => (
  <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
    <FormContext
      afterCaseCreated={afterCaseCreated}
      caseType={caseType}
      hideConnectorServiceNowSir={hideConnectorServiceNowSir}
      onSuccess={onSuccess}
    >
      <CreateCaseForm
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
);

// eslint-disable-next-line import/no-default-export
export { CreateCase as default };
