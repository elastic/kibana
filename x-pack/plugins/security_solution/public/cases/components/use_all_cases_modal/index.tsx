/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { CaseStatuses } from '../../../../../cases/common/api';
import { Case, SubCase } from '../../containers/types';
import { AllCasesModal } from './all_cases_modal';

export interface UseAllCasesModalProps {
  onRowClick: (theCase?: Case | SubCase) => void;
  disabledStatuses?: CaseStatuses[];
}

export interface UseAllCasesModalReturnedValues {
  modal: JSX.Element;
  isModalOpen: boolean;
  closeModal: () => void;
  openModal: () => void;
}

export const useAllCasesModal = ({
  onRowClick,
  disabledStatuses,
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
          isModalOpen={isModalOpen}
          onCloseCaseModal={closeModal}
          onRowClick={onClick}
          disabledStatuses={disabledStatuses}
        />
      ),
      isModalOpen,
      closeModal,
      openModal,
      onRowClick,
    }),
    [isModalOpen, closeModal, onClick, disabledStatuses, openModal, onRowClick]
  );

  return state;
};
