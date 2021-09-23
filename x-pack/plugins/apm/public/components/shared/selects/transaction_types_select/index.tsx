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

interface TransactionTypesSelectProps {
  compressed?: boolean;
  defaultValue?: string;
  onChange: (value: string) => void;
}

const allOption: EuiComboBoxOptionOption<string> = {
  label: i18n.translate(
    'xpack.apm.transactionTypesSelectAllDropDownOptionLabel',
    {
      defaultMessage: 'All',
    }
  ),
  value: undefined,
};

export function TransactionTypesSelect({
  compressed,
  defaultValue,
  onChange,
}: TransactionTypesSelectProps) {
  const defaultOption = !defaultValue
    ? allOption
    : { label: defaultValue, value: defaultValue };
  const [selectedOptions, setSelectedOptions] = useState([defaultOption]);

  const [searchValue, setSearchValue] = useState('');

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/suggestions/transaction_types',
        params: {
          query: { string: searchValue },
        },
      });
    },
    [searchValue],
    { preservePreviousData: false }
  );

  const transactionTypes = data?.transactionTypes ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    allOption,
    ...transactionTypes.map((name) => {
      return { label: name, value: name };
    }),
  ];

  const handleChange: (
    changedOptions: Array<EuiComboBoxOptionOption<string>>
  ) => void = (changedOptions) => {
    setSelectedOptions(changedOptions);
    if (changedOptions.length === 1 && changedOptions[0].value) {
      onChange(changedOptions[0].value);
    }
  };

  return (
    <EuiComboBox
      async={true}
      compressed={compressed}
      isLoading={status === FETCH_STATUS.LOADING}
      onChange={handleChange}
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
