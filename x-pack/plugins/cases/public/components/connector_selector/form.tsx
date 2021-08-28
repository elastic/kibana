/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFormRow } from '@elastic/eui';
import { isEmpty } from 'lodash/fp';
import React, { useCallback } from 'react';
import styled from 'styled-components';
import { getFieldValidityAndErrorMessage } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/helpers';
import type { FieldHook } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/types';
import type { ActionConnector } from '../../../common/api/connectors';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';

interface ConnectorSelectorProps {
  connectors: ActionConnector[];
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook<string>;
  idAria: string;
  isEdit: boolean;
  isLoading: boolean;
  handleChange?: (newValue: string) => void;
  hideConnectorServiceNowSir?: boolean;
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
  isEdit = true,
  isLoading = false,
  handleChange,
  hideConnectorServiceNowSir = false,
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

  return isEdit ? (
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
        hideConnectorServiceNowSir={hideConnectorServiceNowSir}
        isLoading={isLoading}
        onChange={onChange}
        selectedConnector={isEmpty(field.value) ? 'none' : field.value}
      />
    </EuiFormRowWrapper>
  ) : null;
};
