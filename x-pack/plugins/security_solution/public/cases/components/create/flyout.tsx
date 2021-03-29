/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiFlyout, EuiFlyoutHeader, EuiTitle, EuiFlyoutBody } from '@elastic/eui';

import * as i18n from '../../translations';
import { useKibana } from '../../../common/lib/kibana';
import { Case } from '../../../../../cases/common';

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
const FormWrapper = styled.div`
  padding-bottom: 50px;
`;

const CreateCaseFlyoutComponent: React.FC<CreateCaseModalProps> = ({
  afterCaseCreated,
  onCloseFlyout,
  onSuccess,
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
