/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';
import { EuiFormRow } from '@elastic/eui';
import styled from 'styled-components';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';
import type { ActionConnector } from '../../../common/api';

interface ConnectorSelectorProps {
  connectors: ActionConnector[];
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
  connectors,
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
      <ConnectorsDropdown
        connectors={connectors}
        disabled={disabled}
        isLoading={isLoading}
        onChange={onChange}
        selectedConnector={isEmpty(field.value) ? 'none' : field.value}
      />
    </EuiFormRowWrapper>
  );
};
ConnectorSelector.displayName = 'ConnectorSelector';
