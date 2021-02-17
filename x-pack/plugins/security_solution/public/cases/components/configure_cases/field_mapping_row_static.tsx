/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCode, EuiFlexItem, EuiFlexGroup, EuiIcon, EuiLoadingSpinner } from '@elastic/eui';

import { capitalize } from 'lodash/fp';
import { CaseField, ActionType, ThirdPartyField } from '../../containers/configure/types';

export interface RowProps {
  isLoading: boolean;
  securitySolutionField: CaseField;
  selectedActionType: ActionType;
  selectedThirdParty: ThirdPartyField;
}

const FieldMappingRowComponent: React.FC<RowProps> = ({
  isLoading,
  securitySolutionField,
  selectedActionType,
  selectedThirdParty,
}) => {
  const selectedActionTypeCapitalized = useMemo(() => capitalize(selectedActionType), [
    selectedActionType,
  ]);
  return (
    <EuiFlexGroup data-test-subj="static-mappings" alignItems="center">
      <EuiFlexItem>
        <EuiFlexGroup component="span" justifyContent="spaceBetween">
          <EuiFlexItem component="span" grow={false}>
            <EuiCode data-test-subj="field-mapping-source">{securitySolutionField}</EuiCode>
          </EuiFlexItem>
          <EuiFlexItem component="span" grow={false}>
            <EuiIcon type="sortRight" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup component="span" justifyContent="spaceBetween">
          <EuiFlexItem component="span" grow={false}>
            {isLoading ? (
              <EuiLoadingSpinner size="m" />
            ) : (
              <EuiCode data-test-subj="field-mapping-target">{selectedThirdParty}</EuiCode>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem>
        {isLoading ? <EuiLoadingSpinner size="m" /> : selectedActionTypeCapitalized}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const FieldMappingRowStatic = React.memo(FieldMappingRowComponent);
