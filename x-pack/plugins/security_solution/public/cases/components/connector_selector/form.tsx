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
  field: FieldHook;
  idAria: string;
  defaultValue?: string;
  disabled: boolean;
  isLoading: boolean;
}
export const ConnectorSelector = ({
  connectors,
  dataTestSubj,
  defaultValue,
  field,
  idAria,
  disabled = false,
  isLoading = false,
}: ConnectorSelectorProps) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

  useEffect(() => {
    field.setValue(defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const handleContentChange = useCallback(
    (newConnector: string) => {
      field.setValue(connectors.find((c) => c.id === newConnector) ?? null);
    },
    [field, connectors]
  );

  return (
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
        selectedConnector={(field.value as ActionConnector)?.id ?? 'none'}
        disabled={disabled}
        isLoading={isLoading}
        onChange={handleContentChange}
      />
    </EuiFormRow>
  );
};
