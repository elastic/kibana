/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
interface Props {
  title: string;
  description: string;
  fieldLabel: string;
  isLoading: boolean;
  options?: Array<EuiComboBoxOptionOption<string>>;
  isDisabled: boolean;
  value?: string;
  onChange: (value?: string) => void;
  dataTestSubj?: string;
}

export function FormRowSelect({
  title,
  description,
  fieldLabel,
  isLoading,
  options,
  isDisabled,
  onChange,
  value,
  dataTestSubj,
}: Props) {
  const selectedOptions = useMemo(() => {
    const optionFound = options?.find((option) => option.value === value);
    return optionFound ? [optionFound] : undefined;
  }, [options, value]);

  const handleOnChange = (
    nextSelectedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    const [selectedOption] = nextSelectedOptions;
    onChange(selectedOption.value);
  };

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
          data-test-subj={dataTestSubj}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
