/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { CaseType } from '../../../../../case/common/api';
import { Case } from '../../containers/types';
import { CreateCaseModal } from './create_case_modal';

export interface UseCreateCaseModalProps {
  onCaseCreated: (theCase: Case) => void;
  caseType?: CaseType;
}
export interface UseCreateCaseModalReturnedValues {
  modal: JSX.Element;
  isModalOpen: boolean;
  closeModal: () => void;
  openModal: () => void;
}

export const useCreateCaseModal = ({
  caseType = CaseType.individual,
  onCaseCreated,
}: UseCreateCaseModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const onSuccess = useCallback(
    (theCase) => {
      onCaseCreated(theCase);
      closeModal();
    },
    [onCaseCreated, closeModal]
  );

  const state = useMemo(
    () => ({
      modal: (
        <CreateCaseModal
          caseType={caseType}
          isModalOpen={isModalOpen}
          onCloseCaseModal={closeModal}
          onSuccess={onSuccess}
        />
      ),
      isModalOpen,
      closeModal,
      openModal,
    }),
    [caseType, closeModal, isModalOpen, onSuccess, openModal]
  );

  return state;
};
