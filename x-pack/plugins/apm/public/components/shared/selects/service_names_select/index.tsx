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

interface SericeNamesSelectProps {
  compressed?: boolean;
  defaultValue?: string;
  onChange: (value: string) => void;
  environment?: string;
  transactionType?: string;
}

const allOption: EuiComboBoxOptionOption<string> = {
  label: ENVIRONMENT_ALL.text,
  value: ENVIRONMENT_ALL.value,
};

export function ServiceNamesSelect({
  compressed,
  defaultValue,
  onChange,
  environment,
  transactionType,
}: ServiceNamesSelect) {
  const defaultOption =
    !defaultValue || defaultValue === ENVIRONMENT_ALL.value
      ? allOption
      : { label: defaultValue, value: defaultValue };
  const [selectedOptions, setSelectedOptions] = useState([defaultOption]);

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/suggestions/service_names',
        params: {
          query: { environment, transactionType },
        },
      });
    },
    [environment, transactionType],
    { preservePreviousData: false }
  );

  const serviceNames = data?.serviceNames ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    allOption,
    ...serviceNames.map((name) => {
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
      compressed={compressed}
      isLoading={status === FETCH_STATUS.LOADING}
      onChange={handleChange}
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
