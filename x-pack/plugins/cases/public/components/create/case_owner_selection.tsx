/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { euiStyled } from '../../../../../../src/plugins/kibana_react/common';
import { FieldHook, getFieldValidityAndErrorMessage, UseField } from '../../common/shared_imports';

interface MenuSelectionProps {
  field: FieldHook<string>;
  isLoading: boolean;
  availableOwners: string[];
}

interface Props {
  availableOwners: string[];
  isLoading: boolean;
}

const SECURITY_SOLUTION = 'securitySolution';
const OBSERVABILITY = 'observability';
const FIELD_NAME = 'selectedOwner';

const FullWidthKeyPadMenu = euiStyled(EuiKeyPadMenu)`
  width: 100%;
`;

const FullWidthKeyPadItem = euiStyled(EuiKeyPadMenuItem)`
  width: 100%
`;

const CaseOwnerSelectionComponent: React.FC<Props> = ({ availableOwners, isLoading }) => {
  return (
    <UseField
      path={FIELD_NAME}
      component={MenuSelection}
      componentProps={{ availableOwners, isLoading }}
    />
  );
};

function MenuSelection({
  availableOwners,
  field,
  isLoading = false,
}: MenuSelectionProps): JSX.Element {
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
      <FullWidthKeyPadMenu checkable={{ ariaLegend: 'Single case type select' }}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <FullWidthKeyPadItem
              data-test-subj="securitySolutionRadioButton"
              onChange={onChange}
              checkable="single"
              name={radioGroupName}
              id={SECURITY_SOLUTION}
              label="Security"
              isSelected={field.value === SECURITY_SOLUTION}
              isDisabled={isLoading || !availableOwners.includes(SECURITY_SOLUTION)}
            >
              <EuiIcon type="logoSecurity" size="xl" />
            </FullWidthKeyPadItem>
          </EuiFlexItem>
          <EuiFlexItem>
            <FullWidthKeyPadItem
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
            </FullWidthKeyPadItem>
          </EuiFlexItem>
        </EuiFlexGroup>
      </FullWidthKeyPadMenu>
    </EuiFormRow>
  );
}

CaseOwnerSelectionComponent.displayName = 'CaseOwnerSelectionComponent';

export const CaseOwnerSelection = memo(CaseOwnerSelectionComponent);
