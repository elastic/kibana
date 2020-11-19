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

import { capitalize } from 'lodash/fp';
import { CaseField, ActionType, ThirdPartyField } from '../../containers/configure/types';
import { AllThirdPartyFields } from '../../../common/lib/connectors/types';

export interface RowProps {
  id: string;
  disabled: boolean;
  securitySolutionField: CaseField;
  thirdPartyOptions: Array<EuiSuperSelectOption<AllThirdPartyFields>>;
  actionTypeOptions: Array<EuiSuperSelectOption<ActionType>>;
  onChangeActionType: (caseField: CaseField, newActionType: ActionType) => void;
  onChangeThirdParty: (caseField: CaseField, newThirdPartyField: ThirdPartyField) => void;
  selectedActionType: ActionType;
  selectedThirdParty: ThirdPartyField;
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
