/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useCallback } from 'react';
import styled from 'styled-components';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
} from '@elastic/eui';

import { FormContext } from '../create/form_context';
import { CreateCaseForm } from '../create/form';
import { SubmitCaseButton } from '../create/submit_button';
import { Case } from '../../containers/types';
import * as i18n from '../../translations';

export interface CreateCaseModalProps {
  onCloseCaseModal: () => void;
  onCaseCreated: (theCase: Case) => void;
}

const Container = styled.div`
  ${({ theme }) => `
    margin-top: ${theme.eui.euiSize};
    text-align: right;
  `}
`;

const CreateModalComponent: React.FC<CreateCaseModalProps> = ({
  onCloseCaseModal,
  onCaseCreated,
}) => {
  const onSuccess = useCallback(
    (theCase) => {
      onCaseCreated(theCase);
      onCloseCaseModal();
    },
    [onCaseCreated, onCloseCaseModal]
  );

  return (
    <EuiOverlayMask data-test-subj="all-cases-modal">
      <EuiModal onClose={onCloseCaseModal}>
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.CREATE_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <FormContext onSuccess={onSuccess}>
            <CreateCaseForm withSteps={false} />
            <Container>
              <SubmitCaseButton />
            </Container>
          </FormContext>
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
};

export const CreateCaseModal = memo(CreateModalComponent);

CreateCaseModal.displayName = 'CreateCaseModal';
