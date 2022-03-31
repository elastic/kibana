/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiDescribedFormGroup,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiComboBox,
} from '@elastic/eui';
interface Props {
  title: string;
  description: string;
  fieldLabel: string;
  isLoading: boolean;
  options?: Array<EuiComboBoxOptionOption<string>>;
  isDisabled: boolean;
  value?: string;
  onChange: (value?: string) => void;
}

export function FormRowSelect({
  title,
  description,
  fieldLabel,
  isLoading,
  options,
  isDisabled,
  onChange,
}: Props) {
  const [selectedOptions, setSelected] = useState<
    Array<EuiComboBoxOptionOption<string>> | undefined
  >([]);

  const handleOnChange = (
    nextSelectedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    const [selectedOption] = nextSelectedOptions;
    setSelected(nextSelectedOptions);
    onChange(selectedOption.value);
  };

  useEffect(() => {
    setSelected(undefined);
  }, [isLoading]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={<h3>{title}</h3>}
      description={description}
    >
      <EuiFormRow label={fieldLabel}>
        <EuiComboBox
          isClearable={false}
          isLoading={isLoading}
          singleSelection={{ asPlainText: true }}
          options={options}
          isDisabled={isDisabled}
          selectedOptions={selectedOptions}
          onChange={handleOnChange}
          placeholder={i18n.translate(
            'xpack.apm.agentConfig.servicePage.environment.placeholder',
            { defaultMessage: 'Select Option' }
          )}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
