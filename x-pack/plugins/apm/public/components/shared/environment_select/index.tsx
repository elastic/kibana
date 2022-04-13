/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useCallback } from 'react';
import { debounce } from 'lodash';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  getEnvironmentLabel,
  ENVIRONMENT_NOT_DEFINED,
  ENVIRONMENT_ALL,
} from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../common/elasticsearch_fieldnames';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { useServiceName } from '../../../hooks/use_service_name';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useApmParams } from '../../../hooks/use_apm_params';
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
  onChange,
}: {
  environment: Environment;
  availableEnvironments: Environment[];
  status: FETCH_STATUS;
  onChange: (value: string) => void;
}) {
  const [searchValue, setSearchValue] = useState('');
  const serviceName = useServiceName();

  const { query } = useApmParams('/services/{serviceName}/*');
  const { rangeFrom, rangeTo } = query;

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = [
    {
      value: environment,
      label: getEnvironmentLabel(environment),
    },
  ];

  const onSelect = useCallback(
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
              start: start,
              end: end,
            },
          },
        });
      }
    },
    [searchValue, start, end, serviceName]
  );
  const terms = data?.terms ?? [];

  const environmentOptions = useMemo(
    () => getEnvironmentOptions(availableEnvironments),
    [availableEnvironments]
  );

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(searchValue === ''
      ? environmentOptions
      : terms.map((name) => {
          return { label: name, value: name };
        })),
  ];

  const onSearch = useMemo(() => debounce(setSearchValue, 300), []);

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
      onChange={(changedOptions) => onSelect(changedOptions)}
      onSearchChange={onSearch}
      isLoading={
        status === FETCH_STATUS.LOADING || searchStatus === FETCH_STATUS.LOADING
      }
    />
  );
}
