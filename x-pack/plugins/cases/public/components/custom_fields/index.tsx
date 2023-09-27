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
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import { CustomFieldsList } from './custom_fields_list';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';

export interface Props {
  customFields: CustomFieldsConfiguration;
  disabled: boolean;
  isLoading: boolean;
  handleAddCustomField: () => void;
  handleDeleteCustomField: (key: string) => void;
  handleEditCustomField: (key: string) => void;
}
const CustomFieldsComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  handleAddCustomField,
  handleDeleteCustomField,
  handleEditCustomField,
  customFields,
}) => {
  const { permissions } = useCasesContext();
  const canAddCustomFields = permissions.create && permissions.update;
  const [error, setError] = useState<boolean>(false);

  const onAddCustomField = useCallback(() => {
    if (customFields.length === MAX_CUSTOM_FIELDS_PER_CASE && !error) {
      setError(true);
      return;
    }

    handleAddCustomField();
    setError(false);
  }, [handleAddCustomField, setError, customFields, error]);

  const onEditCustomField = useCallback(
    (key: string) => {
      setError(false);
      handleEditCustomField(key);
    },
    [setError, handleEditCustomField]
  );

  if (customFields.length < MAX_CUSTOM_FIELDS_PER_CASE && error) {
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
      data-test-subj="custom-fields-form-group"
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {customFields.length ? (
          <>
            <CustomFieldsList
              customFields={customFields}
              onDeleteCustomField={handleDeleteCustomField}
              onEditCustomField={onEditCustomField}
            />
            {error ? (
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText color="danger">
                    {i18n.MAX_CUSTOM_FIELD_LIMIT(MAX_CUSTOM_FIELDS_PER_CASE)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null}
          </>
        ) : null}
        <EuiSpacer size="m" />
        {!customFields.length ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              {i18n.NO_CUSTOM_FIELDS}
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
              data-test-subj="add-custom-field"
            >
              {i18n.ADD_CUSTOM_FIELD}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiDescribedFormGroup>
  ) : null;
};
CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);
