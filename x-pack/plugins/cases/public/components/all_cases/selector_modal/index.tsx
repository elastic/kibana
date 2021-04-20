/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';
import styled from 'styled-components';
import { Case, CaseStatuses, CommentRequestAlertType, SubCase } from '../../../../common';
import { CasesNavigation } from '../../links';
import * as i18n from '../../../common/translations';
import { AllCasesGeneric } from '../all_cases_generic';

export interface AllCasesSelectorModalProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  createCaseNavigation: CasesNavigation;
  disabledStatuses?: CaseStatuses[];
  onRowClick: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
  userCanCrud: boolean;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => `
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

export const AllCasesSelectorModal: React.FC<AllCasesSelectorModalProps> = ({
  alertData,
  createCaseNavigation,
  disabledStatuses,
  onRowClick,
  updateCase,
  userCanCrud,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
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
          disabledStatuses={disabledStatuses}
          isSelectorView={true}
          onRowClick={onClick}
          userCanCrud={userCanCrud}
          updateCase={updateCase}
        />
      </EuiModalBody>
    </Modal>
  ) : null;
};
// eslint-disable-next-line import/no-default-export
export { AllCasesSelectorModal as default };
