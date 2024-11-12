/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { IPivotAggsConfigPercentiles, ValidationResultErrorType } from './types';

interface PercentOption {
  label: string;
}

const ERROR_MESSAGES: Record<ValidationResultErrorType, string> = {
  INVALID_FORMAT: i18n.translate('xpack.transform.agg.popoverForm.invalidFormatError', {
    defaultMessage: 'Enter a comma-separated list of percentile',
  }),
  PERCENTILE_OUT_OF_RANGE: i18n.translate(
    'xpack.transform.agg.popoverForm.percentileOutOfRangeError',
    {
      defaultMessage: 'Percentiles must be between 0 and 100',
    }
  ),
};

export const PercentilesAggForm: IPivotAggsConfigPercentiles['AggFormComponent'] = ({
  aggConfig,
  onChange,
  isValid,
  errorMessageType,
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Array<{ label: string }>>(
    aggConfig.percents?.map((p) => ({ label: p.toString() })) ?? []
  );

  const handleCreateOption = (inputValue: string) => {
    if (!isValid) return false;

    const newOption: PercentOption = {
      label: inputValue,
    };
    const updatedOptions = [...selectedOptions, newOption];

    setSelectedOptions(updatedOptions);
    onChange({ percents: updatedOptions.map((option) => Number(option.label)) });
  };

  const handleOptionsChange = (newOptions: Array<EuiComboBoxOptionOption<string>>) => {
    setSelectedOptions(newOptions);
    onChange({ percents: newOptions.map((option) => Number(option.label)) });
  };

  const handleSearchChange = (searchValue: string) => {
    onChange({
      ...aggConfig,
      pendingPercentileInput: searchValue,
    });
  };

  const getErrorMessage = (): string | undefined => {
    if (!isValid && errorMessageType) {
      return ERROR_MESSAGES[errorMessageType];
    }
  };

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.transform.agg.popoverForm.percentsLabel', {
          defaultMessage: 'Percents',
        })}
        error={getErrorMessage()}
        isInvalid={!isValid}
      >
        <EuiComboBox
          noSuggestions
          selectedOptions={selectedOptions}
          onCreateOption={handleCreateOption}
          onChange={handleOptionsChange}
          onSearchChange={handleSearchChange}
          isInvalid={!isValid}
        />
      </EuiFormRow>
    </>
  );
};
