/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { useGetCases } from '../../../containers/use_get_cases';
import { CasesDropdown } from './cases_dropdown';

interface ExistingCaseProps {
  selectedCase: string | null;
  onCaseChanged: (id: string) => void;
}

const ExistingCaseComponent: React.FC<ExistingCaseProps> = ({ onCaseChanged, selectedCase }) => {
  const { data: cases, loading: isLoadingCases } = useGetCases();

  const onChange = useCallback(
    (id: string) => {
      if (id === 'add-case') {
        return;
      }

      onCaseChanged(id);
    },
    [onCaseChanged]
  );

  const isCasesLoading = useMemo(
    () => isLoadingCases.indexOf('cases') > -1 || isLoadingCases.indexOf('caseUpdate') > -1,
    [isLoadingCases]
  );

  return (
    <CasesDropdown
      isLoading={isCasesLoading}
      cases={cases.cases}
      selectedCase={selectedCase ?? undefined}
      onCaseChanged={onChange}
    />
  );
};

export const ExistingCase = memo(ExistingCaseComponent);
