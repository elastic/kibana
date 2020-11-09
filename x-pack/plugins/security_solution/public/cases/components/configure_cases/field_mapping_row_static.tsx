/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiIcon } from '@elastic/eui';

import { capitalize } from 'lodash/fp';
import { CaseField, ActionType, ThirdPartyField } from '../../containers/configure/types';

export interface RowProps {
  securitySolutionField: CaseField;
  selectedActionType: ActionType;
  selectedThirdParty: ThirdPartyField;
}

const FieldMappingRowComponent: React.FC<RowProps> = ({
  securitySolutionField,
  selectedActionType,
  selectedThirdParty,
}) => {
  const selectedActionTypeCapitalized = useMemo(() => capitalize(selectedActionType), [
    selectedActionType,
  ]);
  const selectedThirdPartyCapitalized = useMemo(() => capitalize(selectedThirdParty), [
    selectedThirdParty,
  ]);
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
      <EuiFlexItem>{selectedThirdPartyCapitalized}</EuiFlexItem>
      <EuiFlexItem>{selectedActionTypeCapitalized}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldMappingRowStatic = React.memo(FieldMappingRowComponent);
