/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';

import { FormContext } from '../create/form_context';
import { CreateCaseForm } from '../create/form';
import { SubmitCaseButton } from '../create/submit_button';
import { Case } from '../../containers/types';
import * as i18n from '../../translations';
import { CaseType } from '../../../../../case/common/api';

export interface CreateCaseModalProps {
  isModalOpen: boolean;
  onCloseCaseModal: () => void;
  onSuccess: (theCase: Case) => void;
  caseType?: CaseType;
}

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
    text-align: right;
  `}
`;

const CreateModalComponent: React.FC<CreateCaseModalProps> = ({
  isModalOpen,
  onCloseCaseModal,
  onSuccess,
  caseType = CaseType.individual,
}) => {
  return isModalOpen ? (
    <EuiModal onClose={onCloseCaseModal} data-test-subj="all-cases-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.CREATE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <FormContext caseType={caseType} onSuccess={onSuccess}>
          <CreateCaseForm withSteps={false} />
          <Container>
            <SubmitCaseButton />
          </Container>
        </FormContext>
      </EuiModalBody>
    </EuiModal>
  ) : null;
};

export const CreateCaseModal = memo(CreateModalComponent);

CreateCaseModal.displayName = 'CreateCaseModal';
