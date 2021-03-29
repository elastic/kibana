/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import { Case } from '../../containers/types';
import * as i18n from '../../translations';
import { useKibana } from '../../../common/lib/kibana';

export interface CreateCaseModalProps {
  onCloseFlyout: () => void;
  onSuccess: (theCase: Case) => Promise<void>;
  afterCaseCreated?: (theCase: Case) => Promise<void>;
}

const StyledFlyout = styled(EuiFlyout)`
  ${({ theme }) => `w
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
  const { cases } = useKibana().services;
  return (
    <StyledFlyout onClose={onCloseFlyout} data-test-subj="create-case-flyout">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{i18n.CREATE_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FormWrapper>
          {/* TODO: STEPH TEST THIS*/}
          {cases.getCreateCase({
            afterCaseCreated,
            onCancel: onCloseFlyout,
            onSuccess,
            withSteps: false,
          })}
        </FormWrapper>
      </EuiFlyoutBody>
    </StyledFlyout>
  );
};

export const CreateCaseFlyout = memo(CreateCaseFlyoutComponent);

CreateCaseFlyout.displayName = 'CreateCaseFlyout';
