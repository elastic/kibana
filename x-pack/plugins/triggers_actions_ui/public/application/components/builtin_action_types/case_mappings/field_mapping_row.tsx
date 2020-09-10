/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  EuiSuperSelect,
  EuiIcon,
  EuiSuperSelectOption,
} from '@elastic/eui';

import { capitalize } from 'lodash';

export interface RowProps {
  id: string;
  disabled: boolean;
  securitySolutionField: string;
  thirdPartyOptions: Array<EuiSuperSelectOption<string>>;
  actionTypeOptions: Array<EuiSuperSelectOption<string>>;
  onChangeActionType: (caseField: string, newActionType: string) => void;
  onChangeThirdParty: (caseField: string, newThirdPartyField: string) => void;
  selectedActionType: string;
  selectedThirdParty: string;
}

const FieldMappingRowComponent: React.FC<RowProps> = ({
  id,
  disabled,
  securitySolutionField,
  thirdPartyOptions,
  actionTypeOptions,
  onChangeActionType,
  onChangeThirdParty,
  selectedActionType,
  selectedThirdParty,
}) => {
  const securitySolutionFieldCapitalized = useMemo(() => capitalize(securitySolutionField), [
    securitySolutionField,
  ]);
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup component="span" justifyContent="spaceBetween">
          <EuiFlexItem component="span" grow={false}>
            {securitySolutionFieldCapitalized}
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiIcon type="sortRight" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSuperSelect
          disabled={disabled}
          options={thirdPartyOptions}
          valueOfSelected={selectedThirdParty}
          onChange={onChangeThirdParty.bind(null, securitySolutionField)}
          data-test-subj={`case-configure-third-party-select-${id}`}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSuperSelect
          disabled={disabled}
          options={actionTypeOptions}
          valueOfSelected={selectedActionType}
          onChange={onChangeActionType.bind(null, securitySolutionField)}
          data-test-subj={`case-configure-action-type-select-${id}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldMappingRow = React.memo(FieldMappingRowComponent);
