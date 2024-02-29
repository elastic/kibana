/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { debounce } from 'lodash';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  getEnvironmentLabel,
  ENVIRONMENT_NOT_DEFINED,
  ENVIRONMENT_ALL,
} from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../common/es_fields/apm';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import { Environment } from '../../../../common/environment_rt';

function getEnvironmentOptions(environments: Environment[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED.value)
    .map((environment) => ({
      value: environment,
      label: environment,
    }));

  return [
    ENVIRONMENT_ALL,
    ...(environments.includes(ENVIRONMENT_NOT_DEFINED.value)
      ? [ENVIRONMENT_NOT_DEFINED]
      : []),
    ...environmentOptions,
  ];
}

export function EnvironmentSelect({
  environment,
  availableEnvironments,
  status,
  serviceName,
  rangeFrom,
  rangeTo,
  onChange,
}: {
  environment: Environment;
  availableEnvironments: Environment[];
  status: FETCH_STATUS;
  serviceName?: string;
  rangeFrom: string;
  rangeTo: string;
  onChange: (value: string) => void;
}) {
  const [searchValue, setSearchValue] = useState('');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = [
    {
      value: environment,
      label: getEnvironmentLabel(environment),
    },
  ];

  const onSelect = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (changedOptions.length === 1 && changedOptions[0].value) {
      onChange(changedOptions[0].value);
    }
  };

  const { data, status: searchStatus } = useFetcher(
    (callApmApi) => {
      return isEmpty(searchValue)
        ? Promise.resolve({ terms: [] })
        : callApmApi('GET /internal/apm/suggestions', {
            params: {
              query: {
                fieldName: SERVICE_ENVIRONMENT,
                fieldValue: searchValue,
                serviceName,
                start,
                end,
              },
            },
          });
    },
    [searchValue, start, end, serviceName]
  );
  const terms = data?.terms ?? [];

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(searchValue === ''
      ? getEnvironmentOptions(availableEnvironments)
      : terms.map((name) => {
          return { label: name, value: name };
        })),
  ];

  const onSearch = useMemo(() => debounce(setSearchValue, 300), []);

  return (
    <EuiComboBox
      data-test-subj="environmentFilter"
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
      onChange={(changedOptions) => onSelect(changedOptions)}
      onSearchChange={onSearch}
      isLoading={
        status === FETCH_STATUS.LOADING || searchStatus === FETCH_STATUS.LOADING
      }
    />
  );
}
