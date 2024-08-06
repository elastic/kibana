/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { isEmpty } from 'lodash/fp';
import { EuiFormRow } from '@elastic/eui';
import { css } from '@emotion/react';

import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnector } from '../../../common/types/domain';
import { ConnectorsDropdown } from '../configure_cases/connectors_dropdown';

interface ConnectorSelectorProps {
  connectors: ActionConnector[];
  dataTestSubj: string;
  disabled: boolean;
  field: FieldHook<string>;
  idAria: string;
  isLoading: boolean;
  handleChange?: (newValue: string) => void;
}

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

  const isConnectorAvailable = Boolean(
    connectors.find((connector) => connector.id === field.value)
  );

  return (
    <EuiFormRow
      css={css`
        .euiFormErrorText {
          display: none;
        }
      `}
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
        selectedConnector={isEmpty(field.value) || !isConnectorAvailable ? 'none' : field.value}
      />
    </EuiFormRow>
  );
};
ConnectorSelector.displayName = 'ConnectorSelector';
