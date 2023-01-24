/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import { QueryClientProvider } from '@tanstack/react-query';
import type { CasePostRequest } from '../../../../common/api';
import * as i18n from '../translations';
import type { Case } from '../../../../common/ui/types';
import { CreateCaseForm } from '../form';
import type { UseCreateAttachments } from '../../../containers/use_create_attachments';
import type { CaseAttachmentsWithoutOwner } from '../../../types';
import { casesQueryClient } from '../../cases_context/query_client';

export interface CreateCaseFlyoutProps {
  afterCaseCreated?: (
    theCase: Case,
    createAttachments: UseCreateAttachments['createAttachments']
  ) => Promise<void>;
  onClose?: () => void;
  onSuccess?: (theCase: Case) => Promise<void>;
  attachments?: CaseAttachmentsWithoutOwner;
  headerContent?: React.ReactNode;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
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
        padding: ${theme.eui.euiSizeL} ${theme.eui.euiSizeL} 70px;
        height: auto;
      }
    `}
`;

const FormWrapper = styled.div`
  width: 100%;
`;

export const CreateCaseFlyout = React.memo<CreateCaseFlyoutProps>(
  ({ afterCaseCreated, attachments, headerContent, initialValue, onClose, onSuccess }) => {
    const handleCancel = onClose || function () {};
    const handleOnSuccess = onSuccess || async function () {};

    return (
      <QueryClientProvider client={casesQueryClient}>
        <GlobalStyle />
        <StyledFlyout
          onClose={onClose}
          tour-step="create-case-flyout"
          data-test-subj="create-case-flyout"
          // maskProps is needed in order to apply the z-index to the parent overlay element, not to the flyout only
          maskProps={{ className: maskOverlayClassName }}
        >
          <EuiFlyoutHeader data-test-subj="create-case-flyout-header" hasBorder>
            <EuiTitle size="m">
              <h2>{i18n.CREATE_CASE_TITLE}</h2>
            </EuiTitle>
            {headerContent && headerContent}
          </EuiFlyoutHeader>
          <StyledEuiFlyoutBody>
            <FormWrapper>
              <CreateCaseForm
                afterCaseCreated={afterCaseCreated}
                attachments={attachments}
                onCancel={handleCancel}
                onSuccess={handleOnSuccess}
                withSteps={false}
                initialValue={initialValue}
              />
            </FormWrapper>
          </StyledEuiFlyoutBody>
        </StyledFlyout>
      </QueryClientProvider>
    );
  }
);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
