/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiSelect, EuiSelectOption } from '@elastic/eui';
import React, { memo, useMemo, useCallback } from 'react';
import { Case } from '../../../containers/types';

import * as i18n from './translations';

interface CaseDropdownProps {
  isLoading: boolean;
  cases: Case[];
  selectedCase?: string;
  onCaseChanged: (id: string) => void;
}

const CasesDropdownComponent: React.FC<CaseDropdownProps> = ({
  isLoading,
  cases,
  selectedCase,
  onCaseChanged,
}) => {
  const options: EuiSelectOption[] = useMemo(
    () => cases.map((theCase) => ({ value: theCase.id, text: theCase.title })),
    [cases]
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onCaseChanged(e.target.value),
    [onCaseChanged]
  );

  return (
    <EuiFormRow label={i18n.CASE_CONNECTOR_CASES_DROPDOWN_ROW_LABEL} fullWidth={true}>
      <EuiSelect
        options={options}
        data-test-subj="case-connector-cases-dropdown"
        fullWidth={true}
        isLoading={isLoading}
        value={selectedCase}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};

export const CasesDropdown = memo(CasesDropdownComponent);
