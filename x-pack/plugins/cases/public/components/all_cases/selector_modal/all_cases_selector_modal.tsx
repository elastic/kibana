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
import { Case, CaseStatusWithAllStatus } from '../../../../common/ui/types';
import { CommentRequestAlertType } from '../../../../common/api';
import * as i18n from '../../../common/translations';
import { AllCasesList } from '../all_cases_list';
import { CaseAttachments } from '../../../types';
export interface AllCasesSelectorModalProps {
  /**
   * @deprecated Use the attachments prop instead
   */
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  hiddenStatuses?: CaseStatusWithAllStatus[];
  onRowClick?: (theCase?: Case) => void;
  updateCase?: (newCase: Case) => void;
  onClose?: () => void;
  attachments?: CaseAttachments;
}

const Modal = styled(EuiModal)`
  ${({ theme }) => `
    width: ${theme.eui.euiBreakpoints.l};
    max-width: ${theme.eui.euiBreakpoints.l};
  `}
`;

export const AllCasesSelectorModal = React.memo<AllCasesSelectorModalProps>(
  ({ alertData, attachments, hiddenStatuses, onRowClick, updateCase, onClose }) => {
    const [isModalOpen, setIsModalOpen] = useState<boolean>(true);
    const closeModal = useCallback(() => {
      if (onClose) {
        onClose();
      }
      setIsModalOpen(false);
    }, [onClose]);

    const onClick = useCallback(
      (theCase?: Case) => {
        closeModal();
        if (onRowClick) {
          onRowClick(theCase);
        }
      },
      [closeModal, onRowClick]
    );

    return isModalOpen ? (
      <Modal onClose={closeModal} data-test-subj="all-cases-modal">
        <EuiModalHeader>
          <EuiModalHeaderTitle>{i18n.SELECT_CASE_TITLE}</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <AllCasesList
            alertData={alertData}
            attachments={attachments}
            hiddenStatuses={hiddenStatuses}
            isSelectorView={true}
            onRowClick={onClick}
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
  }
);

AllCasesSelectorModal.displayName = 'AllCasesSelectorModal';
