/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';
import { Field } from '../../../../../../src/plugins/es_ui_shared/static/forms/components/field';
import { getUseField } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/use_field';
import { CaseType } from '../../../common/api/cases/case';
import type { Case } from '../../../common/ui/types';
import type { UsePostComment } from '../../containers/use_post_comment';
import type { Owner } from '../../types';
import { InsertTimeline } from '../insert_timeline';
import { OwnerProvider } from '../owner_context';
import type { CasesTimelineIntegration } from '../timeline_context';
import { CasesTimelineIntegrationProvider } from '../timeline_context';
import { fieldName as descriptionFieldName } from './description';
import { CreateCaseForm } from './form';
import { FormContext } from './form_context';
import { SubmitCaseButton } from './submit_button';
import * as i18n from './translations';

export const CommonUseField = getUseField({ component: Field });

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
  `}
`;

export interface CreateCaseProps extends Owner {
  afterCaseCreated?: (theCase: Case, postComment: UsePostComment['postComment']) => Promise<void>;
  caseType?: CaseType;
  disableAlerts?: boolean;
  hideConnectorServiceNowSir?: boolean;
  onCancel: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  timelineIntegration?: CasesTimelineIntegration;
  withSteps?: boolean;
}

const CreateCaseComponent = ({
  afterCaseCreated,
  caseType,
  hideConnectorServiceNowSir,
  disableAlerts,
  onCancel,
  onSuccess,
  timelineIntegration,
  withSteps,
}: Omit<CreateCaseProps, 'owner'>) => (
  <CasesTimelineIntegrationProvider timelineIntegration={timelineIntegration}>
    <FormContext
      afterCaseCreated={afterCaseCreated}
      caseType={caseType}
      hideConnectorServiceNowSir={hideConnectorServiceNowSir}
      onSuccess={onSuccess}
    >
      <CreateCaseForm
        hideConnectorServiceNowSir={hideConnectorServiceNowSir}
        disableAlerts={disableAlerts}
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

export const CreateCase: React.FC<CreateCaseProps> = React.memo((props) => (
  <OwnerProvider owner={props.owner}>
    <CreateCaseComponent {...props} />
  </OwnerProvider>
));
// eslint-disable-next-line import/no-default-export
export { CreateCase as default };
