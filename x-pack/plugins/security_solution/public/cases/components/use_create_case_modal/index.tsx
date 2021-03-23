/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { CaseType } from '../../../../../cases/common';
import { Case } from '../../containers/types';
// TO DO can delete this garbage once case_details is in
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { CreateCaseModal } from '../../../../../cases/public/components/use_create_case_modal/create_case_modal';

export interface UseCreateCaseModalProps {
  onCaseCreated: (theCase: Case) => void;
  caseType?: CaseType;
  hideConnectorServiceNowSir?: boolean;
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
  hideConnectorServiceNowSir = false,
}: UseCreateCaseModalProps) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const onSuccess = useCallback(
    async (theCase) => {
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
          hideConnectorServiceNowSir={hideConnectorServiceNowSir}
          isModalOpen={isModalOpen}
          onCloseCaseModal={closeModal}
          onSuccess={onSuccess}
        />
      ),
      isModalOpen,
      closeModal,
      openModal,
    }),
    [caseType, closeModal, hideConnectorServiceNowSir, isModalOpen, onSuccess, openModal]
  );

  return state;
};
