/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import {
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { FieldHook, getFieldValidityAndErrorMessage, UseField } from '../../common/shared_imports';
import { useAvailableCasesOwners } from '../app/use_available_owners';

interface MenuSelectionProps {
  field: FieldHook<string>;
  isLoading: boolean;
}

interface Props {
  isLoading: boolean;
}

const SECURITY_SOLUTION = 'securitySolution';
const OBSERVABILITY = 'observability';
const FIELD_NAME = 'selectedOwner';

const CaseOwnerSelectionComponent: React.FC<Props> = ({ isLoading }) => {
  return <UseField path={FIELD_NAME} component={MenuSelection} componentProps={{ isLoading }} />;
};

function MenuSelection({ field, isLoading = false }: MenuSelectionProps): JSX.Element {
  const availableOwners = useAvailableCasesOwners();
  const radioGroupName = useGeneratedHtmlId({ prefix: 'caseOwnerRadioGroup' });
  const { errorMessage, isInvalid } = getFieldValidityAndErrorMessage(field);

  const onChange = useCallback((val: string) => field.setValue(val), [field]);

  return (
    <EuiFormRow
      data-test-subj="caseOwnerSelection"
      fullWidth
      isInvalid={isInvalid}
      error={errorMessage}
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <EuiKeyPadMenu checkable={{ ariaLegend: 'Single select as radios' }}>
        <EuiKeyPadMenuItem
          data-test-subj="securityRadioButton"
          onChange={onChange}
          checkable="single"
          name={radioGroupName}
          id={SECURITY_SOLUTION}
          label="Security"
          isSelected={field.value === SECURITY_SOLUTION}
          isDisabled={isLoading || !availableOwners.includes(SECURITY_SOLUTION)}
        >
          <EuiIcon type="logoSecurity" size="xl" />
        </EuiKeyPadMenuItem>
        <EuiKeyPadMenuItem
          data-test-subj="observabilityRadioButton"
          onChange={onChange}
          checkable="single"
          name={radioGroupName}
          id={OBSERVABILITY}
          label="Observability"
          isSelected={field.value === OBSERVABILITY}
          isDisabled={isLoading || !availableOwners.includes(OBSERVABILITY)}
        >
          <EuiIcon type="logoObservability" size="xl" />
        </EuiKeyPadMenuItem>
      </EuiKeyPadMenu>
    </EuiFormRow>
  );
}

CaseOwnerSelectionComponent.displayName = 'CaseOwnerSelectionComponent';

export const CaseOwnerSelection = memo(CaseOwnerSelectionComponent);
