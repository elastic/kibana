/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFormRow } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';

import { FieldHook, getFieldValidityAndErrorMessage } from '../../../shared_imports';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';
import { ActionConnector } from '../../../../../case/common/api/cases';

interface ConnectorSelectorProps {
  connectors: ActionConnector[];
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook;
  idAria: string;
  isEdit: boolean;
  isLoading: boolean;
}
export const ConnectorSelector = ({
  connectors,
  dataTestSubj,
  disabled = false,
  field,
  idAria,
  isEdit = true,
  isLoading = false,
}: ConnectorSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  return isEdit ? (
    <EuiFormRow
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
        onChange={field.setValue}
        selectedConnector={(field.value as string) ?? 'none'}
      />
    </EuiFormRow>
  ) : null;
};
