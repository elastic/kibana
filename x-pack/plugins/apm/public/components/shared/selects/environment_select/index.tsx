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

interface EnvironmentSelectProps {
  compressed?: boolean;
  defaultValue?: string;
  onChange: (value: string) => void;
  serviceName?: string;
}

const allOption: EuiComboBoxOptionOption<string> = {
  label: i18n.translate('xpack.apm.environmentSelect.allOptionLabel', {
    defaultMessage: 'All',
  }),
  value: 'ALL_OPTION_VALUE',
};

export function EnvironmentSelect({
  compressed,
  defaultValue,
  onChange,
  serviceName,
}: EnvironmentSelectProps) {
  const [selectedOptions, setSelectedOptions] = useState(
    defaultValue ? [allOption] : []
  );

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi({
        endpoint: 'GET /api/apm/settings/agent-configuration/environments',
        params: {
          query: { serviceName },
        },
      });
    },
    [serviceName],
    { preservePreviousData: false }
  );

  const environments = data?.environments ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = environments.map(
    ({ name }) => {
      // TODO: Extract this from agent configuration
      if (name === 'ALL_OPTION_VALUE') {
        return allOption;
      }
      return { label: name, value: name };
    }
  );

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
      placeholder={i18n.translate('xpack.apm.environmentSelectPlaceholder', {
        defaultMessage: 'Select environment',
      })}
      selectedOptions={selectedOptions}
      singleSelection={{ asPlainText: true }}
      style={{ minWidth: '256px' }}
    />
  );
}
