/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFormRow, EuiFlexGroup, EuiFlexItem, EuiButtonEmpty } from '@elastic/eui';
import styled from 'styled-components';

import * as i18n from './translations';
import { BrowserFields } from '../../../../common/containers/source';
import { FieldHook } from '../../../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib';
import { FieldCategorizedComponent } from '../../../../common/components/autocomplete/field_categorized';
import { OptionalFieldLabel } from '../optional_field_label';

const MyLabelButton = styled(EuiButtonEmpty)`
  height: 18px;
  font-size: 12px;

  .euiIcon {
    width: 14px;
    height: 14px;
  }
`;

MyLabelButton.defaultProps = {
  flush: 'right',
};

interface AutocompleteFieldProps {
  dataTestSubj: string;
  field: FieldHook;
  browserFields: BrowserFields;
  isDisabled: boolean;
  showOptional: boolean;
  placeholder?: string;
}

export const AutocompleteField = ({
  dataTestSubj,
  field,
  browserFields,
  isDisabled,
  showOptional,
  placeholder,
}: AutocompleteFieldProps) => {
  const [fieldError, setError] = useState<string | null>(null);

  const handleErrors = useCallback((error: string | null): void => {
    setError(error);
  }, []);

  const handleFieldChange = useCallback(
    (newField: string | undefined): void => {
      field.setValue(newField ?? '');
    },
    [field]
  );

  const handleClearSelection = useCallback((): void => {
    field.setValue('');
  }, [field]);

  const selectedField = useMemo((): string => (field.value as string) ?? '', [field.value]);

  const labelAppend = useMemo((): JSX.Element | null => {
    return (
      <EuiFlexGroup justifyContent="flexEnd">
        {fieldError != null && (
          <EuiFlexItem grow={false}>
            <MyLabelButton
              iconType="refresh"
              onClick={handleClearSelection}
              data-test-subj="fieldAutocompleteResetButton"
            >
              {i18n.RESET}
            </MyLabelButton>
          </EuiFlexItem>
        )}
        {showOptional && (
          <EuiFlexItem grow={false} data-test-subj="fieldAutocompleteOptionalLabel">
            {OptionalFieldLabel}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }, [showOptional, fieldError, handleClearSelection]);

  return (
    <EuiFormRow
      data-test-subj={dataTestSubj}
      helpText={field.helpText}
      label={field.label}
      labelAppend={labelAppend}
      error={fieldError}
      isInvalid={fieldError != null}
      fullWidth
    >
      <FieldCategorizedComponent
        placeholder={placeholder ?? ''}
        browserFields={browserFields}
        selectedField={selectedField}
        isLoading={false}
        isDisabled={isDisabled}
        isClearable={false}
        onError={handleErrors}
        onChange={handleFieldChange}
        data-test-subj={dataTestSubj}
        fieldInputWidth={500}
      />
    </EuiFormRow>
  );
};
