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
import { CaseField, ActionType, CaseConnectorMapping } from '../../containers/configure/types';
import * as i18n from './translations';

export interface FieldMappings {
  [key: string]: CaseConnectorMapping;
}

export interface RowProps {
  actionTypeOptions: Array<EuiSuperSelectOption<ActionType>>;
  disabled: boolean;
  id: string;
  onChangeActionType: (caseField: CaseField, newActionType: ActionType) => void;
  onChangeThirdParty: (caseField: CaseField, newThirdPartyField: string) => void;
  securitySolutionField: CaseField;
  selectedActionType: ActionType;
  selectedThirdParty: string;
  thirdPartyOptions: Array<EuiSuperSelectOption<string>>;
}

const FieldMappingRowComponent: React.FC<RowProps> = ({
  actionTypeOptions,
  disabled,
  id,
  onChangeActionType,
  onChangeThirdParty,
  securitySolutionField,
  selectedActionType,
  selectedThirdParty,
  thirdPartyOptions,
}) => {
  const securitySolutionFieldCapitalized = useMemo(() => capitalize(securitySolutionField), [
    securitySolutionField,
  ]);
  return (
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
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
            disabled={securitySolutionField === 'comments' ? true : disabled}
            isLoading={securitySolutionField === 'comments' ? false : disabled}
            options={
              securitySolutionField !== 'comments'
                ? thirdPartyOptions
                : [
                    {
                      value: 'comments',
                      inputDisplay: i18n.COMMENT,
                      'data-test-subj': 'dropdown-mapping-comment',
                    },
                  ]
            }
            valueOfSelected={securitySolutionField !== 'comments' ? selectedThirdParty : 'comments'}
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
    </EuiFlexItem>
  );
};

export const FieldMappingRow = React.memo(FieldMappingRowComponent);
