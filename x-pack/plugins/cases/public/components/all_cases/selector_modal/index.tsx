/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';
import styled from 'styled-components';
import { Case, CaseStatusWithAllStatus, SubCase } from '../../../../common/ui';
import { CommentRequestAlertType } from '../../../../common/api';
import { CasesNavigation } from '../../links';
import * as i18n from '../../../common/translations';
import { AllCasesGeneric } from '../all_cases_generic';
import { Owner } from '../../../types';
import { OwnerProvider } from '../../owner_context';

export interface AllCasesSelectorModalProps extends Owner {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  createCaseNavigation: CasesNavigation;
  hiddenStatuses?: CaseStatusWithAllStatus[];
  onRowClick: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
  userCanCrud: boolean;
  onClose?: () => void;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => `
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

const AllCasesSelectorModalComponent: React.FC<AllCasesSelectorModalProps> = ({
  alertData,
  createCaseNavigation,
  hiddenStatuses,
  onRowClick,
  updateCase,
  userCanCrud,
  onClose,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  const closeModal = useCallback(() => {
    if (onClose) {
      onClose();
    }
    setIsModalOpen(false);
  }, [onClose]);
  const onClick = useCallback(
    (theCase?: Case | SubCase) => {
      closeModal();
      onRowClick(theCase);
    },
    [closeModal, onRowClick]
  );
  return isModalOpen ? (
    <Modal onClose={closeModal} data-test-subj="all-cases-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <AllCasesGeneric
          alertData={alertData}
          createCaseNavigation={createCaseNavigation}
          hiddenStatuses={hiddenStatuses}
          isSelectorView={true}
          onRowClick={onClick}
          userCanCrud={userCanCrud}
          updateCase={updateCase}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButton color="text" onClick={closeModal}>
          {i18n.CANCEL}
        </EuiButton>
      </EuiModalFooter>
    </Modal>
  ) : null;
};

export const AllCasesSelectorModal: React.FC<AllCasesSelectorModalProps> = React.memo((props) => {
  return (
    <OwnerProvider owner={props.owner}>
      <AllCasesSelectorModalComponent {...props} />
    </OwnerProvider>
  );
});
// eslint-disable-next-line import/no-default-export
export { AllCasesSelectorModal as default };
