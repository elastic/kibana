/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { IPivotAggsConfigPercentiles, ValidationResultErrorType } from './types';

const ERROR_MESSAGES: Record<ValidationResultErrorType, string> = {
  INVALID_FORMAT: i18n.translate('xpack.transform.agg.popoverForm.invalidFormatError', {
    defaultMessage: 'Percentile must be a valid number',
  }),
  PERCENTILE_OUT_OF_RANGE: i18n.translate(
    'xpack.transform.agg.popoverForm.percentileOutOfRangeError',
    {
      defaultMessage: 'Percentiles must be between 0 and 100',
    }
  ),
  NUMBER_TOO_PRECISE: i18n.translate('xpack.transform.agg.popoverForm.numberTooPreciseError', {
    defaultMessage: 'Value is too precise',
  }),
};

export const PercentilesAggForm: IPivotAggsConfigPercentiles['AggFormComponent'] = ({
  aggConfig,
  onChange,
  isValid,
  errorMessageType,
}) => {
  const selectedOptions = useMemo(
    () => aggConfig.percents?.map((p) => ({ label: p.toString() })) ?? [],
    [aggConfig.percents]
  );

  const handleCreateOption = useCallback(
    (inputValue: string) => {
      if (!isValid) return false;

      const newValue = Number(inputValue.replace(',', '.'));

      // Skip if this percentile value already exists after normalizing number formats
      // e.g. "+12" and "12" are considered the same value
      if (aggConfig.percents?.includes(newValue)) {
        return false;
      }

      const newOption = {
        label: newValue.toString(),
      };
      const updatedOptions = [...selectedOptions, newOption];

      onChange({
        percents: updatedOptions.map((option) => Number(option.label)),
      });
    },
    [isValid, onChange, selectedOptions, aggConfig.percents]
  );

  const handleOptionsChange = useCallback(
    (newOptions: Array<EuiComboBoxOptionOption<string>>) => {
      onChange({ percents: newOptions.map((option) => Number(option.label)) });
    },
    [onChange]
  );

  const handleSearchChange = useCallback(
    (searchValue: string) => {
      // If we're clearing the input after a valid creation,
      // this is the post-creation cleanup
      if (searchValue === '' && aggConfig.pendingPercentileInput && isValid) return;

      onChange({
        ...aggConfig,
        pendingPercentileInput: searchValue,
      });
    },
    [aggConfig, onChange, isValid]
  );

  const getErrorMessage = () => {
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
          data-test-subj="transformPercentilesAggPercentsSelector"
        />
      </EuiFormRow>
    </>
  );
};
