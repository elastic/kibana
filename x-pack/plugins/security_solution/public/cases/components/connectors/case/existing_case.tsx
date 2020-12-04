/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useGetCases } from '../../../containers/use_get_cases';
import { useCreateCaseModal } from '../../use_create_case_modal';
import { CasesDropdown, ADD_CASE_BUTTON_ID } from './cases_dropdown';

interface ExistingCaseProps {
  selectedCase: string | null;
  onCaseChanged: (id: string) => void;
}

const ExistingCaseComponent: React.FC<ExistingCaseProps> = ({ onCaseChanged, selectedCase }) => {
  const { data: cases, loading: isLoadingCases, refetchCases } = useGetCases();

  const onCaseCreated = useCallback(() => refetchCases(), [refetchCases]);

  const { Modal: CreateCaseModal, openModal } = useCreateCaseModal({ onCaseCreated });

  const onChange = useCallback(
    (id: string) => {
      if (id === ADD_CASE_BUTTON_ID) {
        openModal();
        return;
      }

      onCaseChanged(id);
    },
    [onCaseChanged, openModal]
  );

  const isCasesLoading = useMemo(
    () => isLoadingCases.includes('cases') || isLoadingCases.includes('caseUpdate'),
    [isLoadingCases]
  );

  return (
    <>
      <CasesDropdown
        isLoading={isCasesLoading}
        cases={cases.cases}
        selectedCase={selectedCase ?? undefined}
        onCaseChanged={onChange}
      />
      <CreateCaseModal />
    </>
  );
};

export const ExistingCase = memo(ExistingCaseComponent);
