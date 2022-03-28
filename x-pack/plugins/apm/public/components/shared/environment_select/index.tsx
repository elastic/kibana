/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../common/elasticsearch_fieldnames';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { Environment } from '../../../../common/environment_rt';

export function EnvironmentSelect({
  environment,
  environmentOptions,
  status,
  serviceName,
  start,
  end,
  onChange,
}: {
  environment: Environment;
  environmentOptions: Array<EuiComboBoxOptionOption<string>>;
  status: FETCH_STATUS;
  serviceName?: string;
  start?: string;
  end?: string;
  onChange: (value: string) => void;
}) {
  const [searchValue, setSearchValue] = useState('');

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = [
    {
      value: environment,
      label: getEnvironmentLabel(environment),
    },
  ];

  const handleChange = useCallback(
    (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      if (changedOptions.length === 1 && changedOptions[0].value) {
        onChange(changedOptions[0].value);
      }
    },
    [onChange]
  );

  const { data, status: searchStatus } = useFetcher(
    (callApmApi) => {
      if (searchValue !== '') {
        return callApmApi('GET /internal/apm/suggestions', {
          params: {
            query: {
              fieldName: SERVICE_ENVIRONMENT,
              fieldValue: searchValue ?? '',
              serviceName,
              start,
              end,
            },
          },
        });
      }
    },
    [searchValue, start, end, serviceName]
  );
  const terms = data?.terms ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(searchValue === '' ? environmentOptions : []),
    ...terms.map((name) => {
      return { label: name, value: name };
    }),
  ];

  return (
    <EuiComboBox
      async
      isClearable={false}
      style={{ minWidth: '256px' }}
      placeholder={i18n.translate('xpack.apm.filter.environment.placeholder', {
        defaultMessage: 'Select environment',
      })}
      prepend={i18n.translate('xpack.apm.filter.environment.label', {
        defaultMessage: 'Environment',
      })}
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      onChange={(changedOptions) => handleChange(changedOptions)}
      onSearchChange={debounce(setSearchValue, 500)}
      isLoading={
        status === FETCH_STATUS.LOADING || searchStatus === FETCH_STATUS.LOADING
      }
    />
  );
}
