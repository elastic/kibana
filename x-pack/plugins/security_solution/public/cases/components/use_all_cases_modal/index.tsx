/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Case } from '../../containers/types';
import { AllCasesModal } from './all_cases_modal';

export interface UseAllCasesModalProps {
  onRowClick: (theCase?: Case) => void;
}

export interface UseAllCasesModalReturnedValues {
  modal: JSX.Element;
  isModalOpen: boolean;
  closeModal: () => void;
  openModal: () => void;
}

export const useAllCasesModal = ({
  onRowClick,
}: UseAllCasesModalProps): UseAllCasesModalReturnedValues => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const onClick = useCallback(
    (theCase?: Case) => {
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
        />
      ),
      isModalOpen,
      closeModal,
      openModal,
      onRowClick,
    }),
    [isModalOpen, closeModal, onClick, openModal, onRowClick]
  );

  return state;
};
