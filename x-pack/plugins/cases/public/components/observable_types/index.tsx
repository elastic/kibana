/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import * as i18n from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import type { ObservableTypesConfiguration } from '../../../common/types/domain';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import { ObservableTypesList } from './observable_types_list';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';

export interface ObservableTypesProps {
  observableTypes: ObservableTypesConfiguration;
  disabled: boolean;
  isLoading: boolean;
  handleAddObservableType: () => void;
  handleDeleteObservableType: (key: string) => void;
  handleEditObservableType: (key: string) => void;
}
const ObservableTypesComponent: React.FC<ObservableTypesProps> = ({
  disabled,
  isLoading,
  handleAddObservableType,
  handleDeleteObservableType,
  handleEditObservableType,
  observableTypes,
}) => {
  const { permissions } = useCasesContext();
  const canAddCustomFields = permissions.create && permissions.update;
  const [error, setError] = useState<boolean>(false);

  const onAddCustomField = useCallback(() => {
    if (observableTypes.length === MAX_CUSTOM_FIELDS_PER_CASE && !error) {
      setError(true);
      return;
    }

    handleAddObservableType();
    setError(false);
  }, [handleAddObservableType, setError, observableTypes, error]);

  const onEditCustomField = useCallback(
    (key: string) => {
      setError(false);
      handleEditObservableType(key);
    },
    [setError, handleEditObservableType]
  );

  if (observableTypes.length < MAX_CUSTOM_FIELDS_PER_CASE && error) {
    setError(false);
  }

  return canAddCustomFields ? (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>{i18n.TITLE}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExperimentalBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.DESCRIPTION}</p>}
      data-test-subj="observable-types-form-group"
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {observableTypes.length ? (
          <>
            <ObservableTypesList
              observableTypes={observableTypes}
              onDeleteObservableType={handleDeleteObservableType}
              onEditObservableType={onEditCustomField}
            />
            {error ? (
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText color="danger">
                    {i18n.MAX_OBSERVABLE_TYPES_LIMIT(MAX_CUSTOM_FIELDS_PER_CASE)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </>
        ) : null}
        <EuiSpacer size="m" />
        {!observableTypes.length ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} data-test-subj="empty-observable-types">
              {i18n.NO_OBSERVABLE_TYPES}
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              isLoading={isLoading}
              isDisabled={disabled || error}
              size="s"
              onClick={onAddCustomField}
              iconType="plusInCircle"
              data-test-subj="add-observable-type"
            >
              {i18n.ADD_OBSERVABLE_TYPE}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiDescribedFormGroup>
  ) : null;
};
ObservableTypesComponent.displayName = 'CustomFields';

export const ObservableTypes = React.memo(ObservableTypesComponent);
