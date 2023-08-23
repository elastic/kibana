/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';
import { EuiFlexGroup, EuiFormRow, EuiSuperSelect, EuiSuperSelectOption, EuiFlexItem, EuiText } from '@elastic/eui';
import styled from 'styled-components';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '../../../common/types/domain';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';

enum customFieldTypes {
  STRING = 'string',
  URL = 'url',
  LIST = 'list',
  BOOLEAN = 'boolean',
}

interface ConnectorSelectorProps {
  customFieldTypes: customFieldTypes[],
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook<string>;
  idAria: string;
  isLoading: boolean;
  handleChange?: (newValue: string) => void;
}

const EuiFormRowWrapper = styled(EuiFormRow)`
  .euiFormErrorText {
    display: none;
  }
`;

export const ConnectorSelector = ({
  customFieldTypes,
  dataTestSubj,
  disabled = false,
  field,
  idAria,
  isLoading = false,
  handleChange,
}: ConnectorSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const onChange = useCallback(
    (val: string) => {
      if (handleChange) {
        handleChange(val);
      }
      field.setValue(val);
    },
    [handleChange, field]
  );

  const options: Array<EuiSuperSelectOption<customFieldTypes[]>> = customFieldTypes.map(
    (fieldType) => {
      return {
        value: fieldType,
        inputDisplay: (
          <EuiFlexGroup
            gutterSize="xs"
            alignItems={'center'}
            responsive={false}
            data-test-subj={`case-severity-filter-${fieldType}`}
          >
            <EuiFlexItem grow={false}>
                <EuiText size="s">{fieldType}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      };
    }
  );

  return (
    <EuiFormRowWrapper
      data-test-subj={dataTestSubj}
      describedByIds={idAria ? [idAria] : undefined}
      error={errorMessage}
      fullWidth
      helpText={field.helpText}
      isInvalid={isInvalid}
      label={field.label}
      labelAppend={field.labelAppend}
    >
      <EuiSuperSelect
        aria-label={"field-type-dropdown"}
        data-test-subj="field-type-dropdown"
        disabled={disabled}
        fullWidth
        isLoading={isLoading}
        onChange={onChange}
        options={options}
        valueOfSelected={field.value}
      />
    </EuiFormRowWrapper>
  );
};
ConnectorSelector.displayName = 'ConnectorSelector';
