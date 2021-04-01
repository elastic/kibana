/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import styled from 'styled-components';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';

import { useGetUserSavedObjectPermissions } from '../../../common/lib/kibana';
import { Case, CaseStatuses, CommentRequestAlertType, SubCase } from '../../../../../cases/common';
import { AllCases } from '../all_cases';
import * as i18n from './translations';

export interface AllCasesModalProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  disabledStatuses?: CaseStatuses[];
  isModalOpen: boolean;
  onCloseCaseModal: () => void;
  onRowClick?: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => `
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

const AllCasesModalComponent: React.FC<AllCasesModalProps> = ({
  alertData,
  disabledStatuses,
  isModalOpen,
  onCloseCaseModal,
  onRowClick,
  updateCase,
}) => {
  const userPermissions = useGetUserSavedObjectPermissions();
  const userCanCrud = userPermissions?.crud ?? false;

  return isModalOpen ? (
    <Modal onClose={onCloseCaseModal} data-test-subj="all-cases-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AllCases
          alertData={alertData}
          disabledStatuses={disabledStatuses}
          isModal
          onRowClick={onRowClick}
          updateCase={updateCase}
          userCanCrud={userCanCrud}
        />
      </EuiModalBody>
    </Modal>
  ) : null;
};

export const AllCasesModal = memo(AllCasesModalComponent);

AllCasesModal.displayName = 'AllCasesModal';
