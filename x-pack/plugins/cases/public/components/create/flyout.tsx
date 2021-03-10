/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import { FormContext } from '../create/form_context';
import { CreateCaseForm } from '../create/form';
import { SubmitCaseButton } from '../create/submit_button';
import { Case } from '../../containers/types';
import * as i18n from '../../common/translations';

export interface CreateCaseModalProps {
  onCloseFlyout: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  afterCaseCreated?: (theCase: Case) => Promise<void>;
}

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
    text-align: right;
  `}
`;

const StyledFlyout = styled(EuiFlyout)`
  ${({ theme }) => `
    z-index: ${theme.eui.euiZModal};
  `}
`;

// Adding bottom padding because timeline's
// bottom bar gonna hide the submit button.
const FormWrapper = styled.div`
  padding-bottom: 50px;
`;

const CreateCaseFlyoutComponent: React.FC<CreateCaseModalProps> = ({
  onSuccess,
  afterCaseCreated,
  onCloseFlyout,
}) => {
  return (
    <StyledFlyout onClose={onCloseFlyout} data-test-subj="create-case-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.CREATE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormWrapper>
          <FormContext onSuccess={onSuccess} afterCaseCreated={afterCaseCreated}>
            <CreateCaseForm withSteps={false} />
            <Container>
              <SubmitCaseButton />
            </Container>
          </FormContext>
        </FormWrapper>
      </EuiFlyoutBody>
    </StyledFlyout>
  );
};

export const CreateCaseFlyout = memo(CreateCaseFlyoutComponent);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
