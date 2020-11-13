/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { CreateCaseModal } from './create_case_modal';

export interface UseAllCasesModalReturnedValues {
  Modal: React.FC;
  showModal: boolean;
  onCloseModal: () => void;
  onOpenModal: () => void;
  onCaseCreated: (id: string) => void;
}

export const useCreateCaseModal = () => {
  const [showModal, setShowModal] = useState<boolean>(false);
  const onCloseModal = useCallback(() => setShowModal(false), []);
  const onOpenModal = useCallback(() => setShowModal(true), []);

  const Modal: React.FC = useCallback(
    () => (showModal ? <CreateCaseModal onCloseCaseModal={onCloseModal} /> : null),
    [onCloseModal, showModal]
  );

  const state = useMemo(
    () => ({
      Modal,
      showModal,
      onCloseModal,
      onOpenModal,
    }),
    [showModal, onCloseModal, onOpenModal, Modal]
  );

  return state;
};
