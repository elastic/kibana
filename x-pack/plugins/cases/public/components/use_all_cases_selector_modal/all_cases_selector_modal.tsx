/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiModal, EuiModalBody, EuiModalHeader, EuiModalHeaderTitle } from '@elastic/eui';

import styled from 'styled-components';
import * as i18n from '../../common/translations';
import { Case, CaseStatuses, CommentRequestAlertType, SubCase } from '../../../common';
import { getAllCasesLazy as getAllCases } from '../../methods';
import { CasesNavigation } from '../links';

export interface AllCasesSelectorProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  createCaseNavigation: CasesNavigation;
  disabledStatuses?: CaseStatuses[];
  isModalOpen: boolean;
  onCloseCaseModal: () => void;
  onRowClick?: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
  userCanCrud: boolean;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => `
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

export const AllCasesSelectorModal: React.FC<AllCasesSelectorProps> = ({
  alertData,
  createCaseNavigation,
  disabledStatuses,
  isModalOpen,
  onCloseCaseModal,
  onRowClick,
  updateCase,
  userCanCrud,
}) => {
  return isModalOpen ? (
    <Modal onClose={onCloseCaseModal} data-test-subj="all-cases-modal">
      <EuiModalHeader>
        <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {getAllCases({
          alertData,
          createCaseNavigation,
          disabledStatuses,
          isModal: true,
          onRowClick,
          userCanCrud,
          updateCase,
        })}
      </EuiModalBody>
    </Modal>
  ) : null;
};
