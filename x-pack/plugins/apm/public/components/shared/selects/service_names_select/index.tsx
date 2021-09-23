/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { FETCH_STATUS, useFetcher } from '../../../../hooks/use_fetcher';

interface ServiceNamesSelectProps {
  allowAll?: boolean;
  compressed?: boolean;
  defaultValue?: string;
  onChange: (value?: string) => void;
}

const allOption: EuiComboBoxOptionOption<string> = {
  label: i18n.translate('xpack.apm.serviceNamesSelectAllDropDownOptionLabel', {
    defaultMessage: 'All',
  }),
  value: undefined,
};

export function ServiceNamesSelect({
  allowAll = true,
  compressed,
  defaultValue,
  onChange,
}: ServiceNamesSelectProps) {
  let defaultOption: EuiComboBoxOptionOption<string> | undefined;
  if (allowAll && !defaultValue) {
    defaultOption = allOption;
  }
  if (defaultValue) {
    defaultOption = { label: defaultValue, value: defaultValue };
  }
  const [selectedOptions, setSelectedOptions] = useState(
    defaultOption ? [defaultOption] : []
  );

  const [searchValue, setSearchValue] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/suggestions/service_names',
        params: {
          query: { string: searchValue },
        },
      });
    },
    [searchValue],
    { preservePreviousData: false }
  );

  const serviceNames = data?.serviceNames ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(allowAll &&
    (searchValue === '' || searchValue.toLowerCase() === allOption.label)
      ? [allOption]
      : []),
    ...serviceNames.map((name) => {
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
        'xpack.apm.serviceNamesSelectCustomOptionText',
        {
          defaultMessage: 'Add \\{searchValue\\} as a new service name',
        }
      )}
      isLoading={status === FETCH_STATUS.LOADING}
      onChange={handleChange}
      onCreateOption={handleCreateOption}
      onSearchChange={setSearchValue}
      options={options}
      placeholder={i18n.translate('xpack.apm.serviceNamesSelectPlaceholder', {
        defaultMessage: 'Select service name',
      })}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      style={{ minWidth: '256px' }}
    />
  );
}
