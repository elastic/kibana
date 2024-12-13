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
import type { CustomFieldsConfiguration } from '../../../common/types/domain';
import { MAX_CUSTOM_FIELDS_PER_CASE } from '../../../common/constants';
import { CustomFieldsList } from './custom_fields_list';

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

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{i18n.TITLE}</h3>}
      description={<p>{i18n.DESCRIPTION}</p>}
      data-test-subj="custom-fields-form-group"
      css={{ alignItems: 'flex-start' }}
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {customFields.length ? (
          <>
            <CustomFieldsList
              customFields={customFields}
              onDeleteCustomField={handleDeleteCustomField}
              onEditCustomField={onEditCustomField}
            />
          </>
        ) : null}
        <EuiSpacer size="s" />
        {!customFields.length ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} data-test-subj="empty-custom-fields">
              {i18n.NO_CUSTOM_FIELDS}
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            {customFields.length < MAX_CUSTOM_FIELDS_PER_CASE ? (
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
            ) : (
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText>{i18n.MAX_CUSTOM_FIELD_LIMIT(MAX_CUSTOM_FIELDS_PER_CASE)}</EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="s" />
      </EuiPanel>
    </EuiDescribedFormGroup>
  );
};
CustomFieldsComponent.displayName = 'CustomFields';

export const CustomFields = React.memo(CustomFieldsComponent);
