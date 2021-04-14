/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Case, CaseStatuses, CommentRequestAlertType, SubCase } from '../../../common';
import { AllCasesSelectorModal } from './all_cases_selector_modal';
import { CasesNavigation } from '../links';

export interface UseAllCasesSelectorModalProps {
  alertData?: Omit<CommentRequestAlertType, 'type'>;
  createCaseNavigation: CasesNavigation;
  disabledStatuses?: CaseStatuses[];
  onRowClick: (theCase?: Case | SubCase) => void;
  updateCase?: (newCase: Case) => void;
  userCanCrud: boolean;
}

export interface UseAllCasesSelectorModalReturnedValues {
  modal: JSX.Element;
  isModalOpen: boolean;
  closeModal: () => void;
  openModal: () => void;
}

export const useAllCasesSelectorModal = ({
  alertData,
  createCaseNavigation,
  disabledStatuses,
  onRowClick,
  updateCase,
  userCanCrud,
}: UseAllCasesSelectorModalProps): UseAllCasesSelectorModalReturnedValues => {
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

  return useMemo(
    () => ({
      modal: (
        <AllCasesSelectorModal
          alertData={alertData}
          createCaseNavigation={createCaseNavigation}
          disabledStatuses={disabledStatuses}
          isModalOpen={isModalOpen}
          onCloseCaseModal={closeModal}
          onRowClick={onClick}
          updateCase={updateCase}
          userCanCrud={userCanCrud}
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
      createCaseNavigation,
      disabledStatuses,
      isModalOpen,
      onClick,
      onRowClick,
      openModal,
      updateCase,
      userCanCrud,
    ]
  );
};
