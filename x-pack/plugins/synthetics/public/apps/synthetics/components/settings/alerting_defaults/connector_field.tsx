/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetUrlParams, useUrlParams } from '../../../hooks';
import { useAlertingDefaults } from './hooks/use_alerting_defaults';
import { alertFormI18n } from './translations';
import { AddConnectorFlyout } from './add_connector_flyout';

export function DefaultConnectorField({
  isLoading,
  isDisabled,
  onChange,
  selectedConnectors,
}: {
  isLoading: boolean;
  isDisabled: boolean;
  selectedConnectors: string[];
  onChange: (connectors: string[]) => void;
}) {
  const { options } = useAlertingDefaults();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const { focusConnectorField } = useGetUrlParams();

  const updateUrlParams = useUrlParams()[1];

  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (focusConnectorField && inputRef.current && !isLoading) {
      inputRef.current.focus();
    }
  }, [focusConnectorField, inputRef, isLoading]);

  const onBlur = () => {
    if (inputRef.current) {
      const { value } = inputRef.current;
      setError(value.length === 0 ? undefined : `"${value}" is not a valid option`);
    }
    if (inputRef.current && !isLoading && focusConnectorField) {
      updateUrlParams({ focusConnectorField: undefined });
    }
  };

  const onSearchChange = (value: string, hasMatchingOptions?: boolean) => {
    setError(
      value.length === 0 || hasMatchingOptions ? undefined : `"${value}" is not a valid option`
    );
  };

  return (
    <RowWrapper
      describedByIds={['defaultConnectors']}
      error={error}
      fullWidth
      label={
        <FormattedMessage
          id="xpack.synthetics.sourceConfiguration.defaultConnectors"
          defaultMessage="Default connectors"
        />
      }
      labelAppend={
        <AddConnectorFlyout
          isDisabled={isDisabled}
          focusInput={useCallback(() => {
            if (inputRef.current) {
              inputRef.current.focus();
            }
          }, [])}
        />
      }
    >
      <EuiComboBox
        inputRef={(input) => {
          inputRef.current = input;
        }}
        placeholder={alertFormI18n.inputPlaceHolder}
        options={options}
        selectedOptions={options.filter((opt) => selectedConnectors?.includes(opt.value))}
        onBlur={onBlur}
        isDisabled={isDisabled}
        data-test-subj={`default-connectors-input-${isLoading ? 'loading' : 'loaded'}`}
        fullWidth
        aria-label={TAGS_LABEL}
        isLoading={isLoading}
        onChange={(newSelectedConnectors) => {
          onChange(newSelectedConnectors.map((tag) => tag.value as string));
        }}
        onSearchChange={onSearchChange}
      />
    </RowWrapper>
  );
}

const RowWrapper = styled(EuiFormRow)`
  &&& > .euiFormRow__labelWrapper {
    align-items: baseline;
  }
`;

export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.tagsLabel', {
  defaultMessage: 'Tags',
});
