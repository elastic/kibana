/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import * as i18n from '../translations';
import { Case } from '../../../../../../cases/common';
import { CASES_OWNER } from '../constants';
import { useKibana } from '../../../../utils/kibana_react';

export interface CreateCaseModalProps {
  afterCaseCreated?: (theCase: Case) => Promise<void>;
  onCloseFlyout: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
}

const StyledFlyout = styled(EuiFlyout)`
  ${({ theme }) => `
    z-index: ${theme.eui.euiZModal};
  `}
`;
// Adding bottom padding because timeline's
// bottom bar gonna hide the submit button.
// might not need for obs, test this when implementing this component
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

function CreateCaseFlyoutComponent({
  afterCaseCreated,
  onCloseFlyout,
  onSuccess,
}: CreateCaseModalProps) {
  const { cases } = useKibana().services;
  return (
    <StyledFlyout onClose={onCloseFlyout} data-test-subj="create-case-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.CREATE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <StyledEuiFlyoutBody>
        <FormWrapper>
          {cases.getCreateCase({
            afterCaseCreated,
            onCancel: onCloseFlyout,
            onSuccess,
            withSteps: false,
            owner: [CASES_OWNER],
            disableAlerts: true,
          })}
        </FormWrapper>
      </StyledEuiFlyoutBody>
    </StyledFlyout>
  );
}
// not yet used
// committing for use with alerting #RAC
export const CreateCaseFlyout = memo(CreateCaseFlyoutComponent);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
