/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { noop } from 'lodash';
import type { CasePostRequest } from '../../../../common/types/api';
import * as i18n from '../translations';
import type { CaseUI } from '../../../../common/ui/types';
import { CreateCaseForm } from '../form';
import type { UseCreateAttachments } from '../../../containers/use_create_attachments';
import type { CaseAttachmentsWithoutOwner } from '../../../types';

export interface CreateCaseFlyoutProps {
  afterCaseCreated?: (
    theCase: CaseUI,
    createAttachments: UseCreateAttachments['mutate']
  ) => Promise<void>;
  onClose?: () => void;
  onSuccess?: (theCase: CaseUI) => void;
  attachments?: CaseAttachmentsWithoutOwner;
  headerContent?: React.ReactNode;
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
}

const StyledFlyout = styled(EuiFlyout)`
  ${({ theme }) => `
      z-index: ${theme.eui.euiZModal};
    `}
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
    const handleCancel = onClose || noop;
    const handleOnSuccess = onSuccess || noop;

    return (
      <>
        <ReactQueryDevtools initialIsOpen={false} />
        <StyledFlyout
          onClose={onClose}
          tour-step="create-case-flyout"
          data-test-subj="create-case-flyout"
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
      </>
    );
  }
);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
