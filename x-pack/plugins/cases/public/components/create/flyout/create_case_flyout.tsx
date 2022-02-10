/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import * as i18n from '../translations';
import { Case } from '../../../../common/ui/types';
import { CreateCaseForm } from '../form';

export interface CreateCaseFlyoutProps {
  afterCaseCreated?: (theCase: Case) => Promise<void>;
  onClose: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
}

const StyledFlyout = styled(EuiFlyout)`
  ${({ theme }) => `
      z-index: ${theme.eui.euiZModal};
    `}
`;

const maskOverlayClassName = 'create-case-flyout-mask-overlay';

/**
 * We need to target the mask overlay which is a parent element
 * of the flyout.
 * A global style is needed to target a parent element.
 */

const GlobalStyle = createGlobalStyle<{ theme: { eui: { euiZLevel5: number } } }>`
  .${maskOverlayClassName} {
    ${({ theme }) => `
    z-index: ${theme.eui.euiZLevel5};
  `}
  }
`;

// Adding bottom padding because timeline's
// bottom bar gonna hide the submit button.
const StyledEuiFlyoutBody = styled(EuiFlyoutBody)`
  ${({ theme }) => `
      && .euiFlyoutBody__overflow {
        overflow-y: auto;
        overflow-x: hidden;
      }

      && .euiFlyoutBody__overflowContent {
        display: block;
        padding: ${theme.eui.paddingSizes.l} ${theme.eui.paddingSizes.l} 70px;
        height: auto;
      }
    `}
`;

const FormWrapper = styled.div`
  width: 100%;
`;

export const CreateCaseFlyout = React.memo<CreateCaseFlyoutProps>(
  ({ afterCaseCreated, onClose, onSuccess }) => (
    <>
      <GlobalStyle />
      <StyledFlyout
        onClose={onClose}
        data-test-subj="create-case-flyout"
        // maskProps is needed in order to apply the z-index to the parent overlay element, not to the flyout only
        maskProps={{ className: maskOverlayClassName }}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>{i18n.CREATE_CASE_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <StyledEuiFlyoutBody>
          <FormWrapper>
            <CreateCaseForm
              afterCaseCreated={afterCaseCreated}
              onCancel={onClose}
              onSuccess={onSuccess}
              withSteps={false}
            />
          </FormWrapper>
        </StyledEuiFlyoutBody>
      </StyledFlyout>
    </>
  )
);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
