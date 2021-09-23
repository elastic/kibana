/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

interface EnvironmentsSelectProps {
  compressed?: boolean;
  defaultValue?: string;
  onChange: (value?: string) => void;
}

const allOption: EuiComboBoxOptionOption<string> = {
  label: ENVIRONMENT_ALL.text,
  value: ENVIRONMENT_ALL.value,
};

export function EnvironmentsSelect({
  compressed,
  defaultValue,
  onChange,
}: EnvironmentsSelectProps) {
  const defaultOption =
    !defaultValue || defaultValue === ENVIRONMENT_ALL.value
      ? allOption
      : { label: defaultValue, value: defaultValue };
  const [selectedOptions, setSelectedOptions] = useState([defaultOption]);
  const [searchValue, setSearchValue] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/suggestions/environments',
        params: {
          query: { string: searchValue },
        },
      });
    },
    [searchValue],
    { preservePreviousData: false }
  );

  const environments = data?.environments ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(searchValue === '' || searchValue.toLowerCase() === allOption.label
      ? [allOption]
      : []),
    ...environments.map((name) => {
      return { label: name, value: name };
    }),
  ];

  const handleChange = (
    changedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => {
    setSelectedOptions(changedOptions);
    if (changedOptions.length === 1) {
      onChange(
        changedOptions[0].value
          ? changedOptions[0].value.trim()
          : changedOptions[0].value
      );
    }
  };

  const handleCreateOption = (value: string) => {
    handleChange([{ label: value, value }]);
  };

  return (
    <EuiComboBox
      async={true}
      compressed={compressed}
      customOptionText={i18n.translate(
        'xpack.apm.environmentsSelectCustomOptionText',
        {
          defaultMessage: 'Add \\{searchValue\\} as a new environment',
        }
      )}
      isLoading={status === FETCH_STATUS.LOADING}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      onSearchChange={setSearchValue}
      options={options}
      placeholder={i18n.translate('xpack.apm.environmentsSelectPlaceholder', {
        defaultMessage: 'Select environment',
      })}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      style={{ minWidth: '256px' }}
    />
  );
}
