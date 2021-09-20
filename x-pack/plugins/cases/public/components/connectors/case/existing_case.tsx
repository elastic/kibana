/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { CaseType } from '../../../../common';
import {
  useGetCases,
  DEFAULT_QUERY_PARAMS,
  DEFAULT_FILTER_OPTIONS,
} from '../../../containers/use_get_cases';
import { useCreateCaseModal } from '../../use_create_case_modal';
import { CasesDropdown, ADD_CASE_BUTTON_ID } from './cases_dropdown';

interface ExistingCaseProps {
  selectedCase: string | null;
  onCaseChanged: (id: string) => void;
}

const ExistingCaseComponent: React.FC<ExistingCaseProps> = ({ onCaseChanged, selectedCase }) => {
  const {
    data: cases,
    loading: isLoadingCases,
    refetchCases,
  } = useGetCases({
    initialQueryParams: DEFAULT_QUERY_PARAMS,
    initialFilterOptions: {
      ...DEFAULT_FILTER_OPTIONS,
      onlyCollectionType: true,
    },
  });

  const onCaseCreated = useCallback(
    (newCase) => {
      refetchCases();
      onCaseChanged(newCase.id);
    },
    [onCaseChanged, refetchCases]
  );

  const { modal, openModal } = useCreateCaseModal({
    onCaseCreated,
    caseType: CaseType.collection,
    // FUTURE DEVELOPER
    // We are making the assumption that this component is only used in rules creation
    // that's why we want to hide ServiceNow SIR
    hideConnectorServiceNowSir: true,
  });

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
      {modal}
    </>
  );
};

export const ExistingCase = memo(ExistingCaseComponent);
