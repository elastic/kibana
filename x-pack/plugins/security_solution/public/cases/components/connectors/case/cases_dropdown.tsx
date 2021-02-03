/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow, EuiSuperSelect, EuiSuperSelectOption } from '@elastic/eui';
import React, { memo, useMemo, useCallback } from 'react';
import { Case } from '../../../containers/types';

import * as i18n from './translations';

interface CaseDropdownProps {
  isLoading: boolean;
  cases: Case[];
  selectedCase?: string;
  onCaseChanged: (id: string) => void;
}

export const ADD_CASE_BUTTON_ID = 'add-case';

const addNewCase = {
  value: ADD_CASE_BUTTON_ID,
  inputDisplay: (
    <span className="euiButtonEmpty euiButtonEmpty--primary euiButtonEmpty--xSmall euiButtonEmpty--flushLeft">
      {i18n.CASE_CONNECTOR_ADD_NEW_CASE}
    </span>
  ),
  'data-test-subj': 'dropdown-connector-add-connector',
};

const CasesDropdownComponent: React.FC<CaseDropdownProps> = ({
  isLoading,
  cases,
  selectedCase,
  onCaseChanged,
}) => {
  const caseOptions: Array<EuiSuperSelectOption<string>> = useMemo(
    () =>
      cases.reduce<Array<EuiSuperSelectOption<string>>>(
        (acc, theCase) => [
          ...acc,
          {
            value: theCase.id,
            inputDisplay: <span>{theCase.title}</span>,
            'data-test-subj': `case-connector-cases-dropdown-${theCase.id}`,
          },
        ],
        []
      ),
    [cases]
  );

  const options = useMemo(() => [...caseOptions, addNewCase], [caseOptions]);
  const onChange = useCallback((id: string) => onCaseChanged(id), [onCaseChanged]);

  return (
    <EuiFormRow label={i18n.CASE_CONNECTOR_CASES_DROPDOWN_ROW_LABEL} fullWidth={true}>
      <EuiSuperSelect
        options={options}
        data-test-subj="case-connector-cases-dropdown"
        disabled={isLoading}
        fullWidth
        isLoading={isLoading}
        valueOfSelected={selectedCase}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};

export const CasesDropdown = memo(CasesDropdownComponent);
