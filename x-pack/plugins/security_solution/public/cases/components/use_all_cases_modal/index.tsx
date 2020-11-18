/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { AllCasesModal } from './all_cases_modal';

export interface UseAllCasesModalProps {
  onRowClick: (id?: string) => void;
}

export interface UseAllCasesModalReturnedValues {
  Modal: React.FC;
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
    (id) => {
      closeModal();
      onRowClick(id);
    },
    [closeModal, onRowClick]
  );

  const Modal: React.FC = useCallback(
    () =>
      isModalOpen ? <AllCasesModal onCloseCaseModal={closeModal} onRowClick={onClick} /> : null,
    [closeModal, onClick, isModalOpen]
  );

  const state = useMemo(
    () => ({
      Modal,
      isModalOpen,
      closeModal,
      openModal,
      onRowClick,
    }),
    [isModalOpen, closeModal, openModal, onRowClick, Modal]
  );

  return state;
};
