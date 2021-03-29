/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Case, CaseStatuses, CommentRequestAlertType, SubCase } from '../../../../../cases/common';
import { AllCasesModal } from './all_cases_modal';

export interface UseAllCasesModalProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  disabledStatuses?: CaseStatuses[];
  onRowClick: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
}

export interface UseAllCasesModalReturnedValues {
  modal: JSX.Element;
  isModalOpen: boolean;
  closeModal: () => void;
  openModal: () => void;
}

export const useAllCasesModal = ({
  alertData,
  disabledStatuses,
  onRowClick,
  updateCase,
}: UseAllCasesModalProps): UseAllCasesModalReturnedValues => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const onClick = useCallback(
    (theCase?: Case | SubCase) => {
      closeModal();
      onRowClick(theCase);
    },
    [closeModal, onRowClick]
  );

  const state = useMemo(
    () => ({
      modal: (
        <AllCasesModal
          alertData={alertData}
          disabledStatuses={disabledStatuses}
          isModalOpen={isModalOpen}
          onCloseCaseModal={closeModal}
          onRowClick={onClick}
          updateCase={updateCase}
        />
      ),
      isModalOpen,
      closeModal,
      openModal,
      onRowClick,
    }),
    [
      alertData,
      closeModal,
      disabledStatuses,
      isModalOpen,
      onClick,
      onRowClick,
      openModal,
      updateCase,
    ]
  );

  return state;
};
