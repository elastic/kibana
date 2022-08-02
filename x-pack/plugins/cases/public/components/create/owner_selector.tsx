/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect } from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { SECURITY_SOLUTION_OWNER } from '../../../common';
import { OBSERVABILITY_OWNER, OWNER_INFO } from '../../../common/constants';

import { FieldHook, getFieldValidityAndErrorMessage, UseField } from '../../common/shared_imports';
import * as i18n from './translations';

interface OwnerSelectorProps {
  field: FieldHook<string>;
  isLoading: boolean;
  availableOwners: string[];
}

interface Props {
  availableOwners: string[];
  isLoading: boolean;
}

const DEFAULT_SELECTABLE_OWNERS = [SECURITY_SOLUTION_OWNER, OBSERVABILITY_OWNER] as const;

const FIELD_NAME = 'selectedOwner';

const FullWidthKeyPadMenu = euiStyled(EuiKeyPadMenu)`
  width: 100%;
`;

const FullWidthKeyPadItem = euiStyled(EuiKeyPadMenuItem)`

  width: 100%;
`;

const OwnerSelector = ({
  availableOwners,
  field,
  isLoading = false,
}: OwnerSelectorProps): JSX.Element => {
  const { errorMessage, isInvalid } = getFieldValidityAndErrorMessage(field);
  const radioGroupName = useGeneratedHtmlId({ prefix: 'caseOwnerRadioGroup' });

  const onChange = useCallback((val: string) => field.setValue(val), [field]);

  useEffect(() => {
    if (!field.value) {
      onChange(
        availableOwners.includes(SECURITY_SOLUTION_OWNER)
          ? SECURITY_SOLUTION_OWNER
          : availableOwners[0]
      );
    }
  }, [availableOwners, field.value, onChange]);

  return (
    <EuiFormRow
      data-test-subj="caseOwnerSelector"
      fullWidth
      isInvalid={isInvalid}
      error={errorMessage}
      helpText={field.helpText}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <FullWidthKeyPadMenu checkable={{ ariaLegend: i18n.ARIA_KEYPAD_LEGEND }}>
        <EuiFlexGroup>
          {DEFAULT_SELECTABLE_OWNERS.map((owner) => (
            <EuiFlexItem key={owner}>
              <FullWidthKeyPadItem
                data-test-subj={`${owner}RadioButton`}
                onChange={onChange}
                checkable="single"
                name={radioGroupName}
                id={owner}
                label={OWNER_INFO[owner].label}
                isSelected={field.value === owner}
                isDisabled={isLoading || !availableOwners.includes(owner)}
              >
                <EuiIcon type={OWNER_INFO[owner].iconType} size="xl" />
              </FullWidthKeyPadItem>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </FullWidthKeyPadMenu>
    </EuiFormRow>
  );
};
OwnerSelector.displayName = 'OwnerSelector';

const CaseOwnerSelector: React.FC<Props> = ({ availableOwners, isLoading }) => {
  return (
    <UseField
      path={FIELD_NAME}
      component={OwnerSelector}
      componentProps={{ availableOwners, isLoading }}
    />
  );
};

CaseOwnerSelector.displayName = 'CaseOwnerSelectionComponent';

export const CreateCaseOwnerSelector = memo(CaseOwnerSelector);
