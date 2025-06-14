/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import {
  getEnvironmentLabel,
  ENVIRONMENT_NOT_DEFINED,
  ENVIRONMENT_ALL,
} from '../../../../common/environment_filter_values';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useTimeRange } from '../../../hooks/use_time_range';
import type { Environment } from '../../../../common/environment_rt';
import { useEnvironmentSelect } from './use_environment_select';

function getEnvironmentOptions(environments: Environment[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED.value)
    .map((environment) => ({
      value: environment,
      label: environment,
    }));

  return [
    ENVIRONMENT_ALL,
    ...(environments.includes(ENVIRONMENT_NOT_DEFINED.value) ? [ENVIRONMENT_NOT_DEFINED] : []),
    ...environmentOptions,
  ];
}

function shouldFetch({
  newValue,
  oldValue,
  optionList,
}: {
  newValue: string;
  oldValue: string;
  optionList: string[];
}) {
  return (
    newValue !== '' &&
    (!optionList.some((option) => option.toLowerCase().includes(newValue.toLowerCase())) ||
      !newValue.toLowerCase().includes(oldValue.toLowerCase()))
  );
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
  const [selectedOption, setSelectedOption] = useState<Array<EuiComboBoxOptionOption<string>>>([
    {
      value: environment,
      label: getEnvironmentLabel(environment),
    },
  ]);

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { data, onSearchChange, searchStatus } = useEnvironmentSelect({ serviceName, start, end });

  const onSelect = (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (changedOptions.length === 1 && changedOptions[0].value) {
      onChange(changedOptions[0].value);
    }
    setSelectedOption(changedOptions);
  };

  const terms = useMemo(() => {
    if (searchValue.trim() === '') {
      return availableEnvironments;
    }

    return [...new Set(data?.terms.concat(...availableEnvironments))];
  }, [availableEnvironments, data?.terms, searchValue]);

  const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
    const environmentOptions = getEnvironmentOptions(terms);

    return searchValue.trim() === ''
      ? environmentOptions
      : environmentOptions.filter((term) =>
          term.value.toLowerCase().includes(searchValue.toLowerCase())
        );
  }, [terms, searchValue]);

  const isInvalid = options.length === 0 && searchValue !== '';

  const onSearch = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (
        shouldFetch({
          newValue: value,
          oldValue: searchValue,
          optionList: terms,
        })
      ) {
        onSearchChange(value);
      }
    },
    [onSearchChange, terms, searchValue]
  );

  // in case the combobox is left empty, returns the current selected environment stored in the URL state
  const onBlur = useCallback(() => {
    setSelectedOption([
      {
        value: environment,
        label: getEnvironmentLabel(environment),
      },
    ]);
  }, [environment]);

  return (
    <EuiFormRow
      aria-label={i18n.translate(
        'xpack.apm.environmentSelect.selectenvironmentComboBox.ariaLabel',
        { defaultMessage: 'Select environment' }
      )}
      error={i18n.translate('xpack.apm.filter.environment.error', {
        defaultMessage: '{value} is not a valid environment',
        values: { value: searchValue },
      })}
      css={{ minWidth: '256px' }}
      isInvalid={isInvalid}
    >
      <EuiComboBox
        data-test-subj="environmentFilter"
        async
        isClearable={false}
        isInvalid={isInvalid}
        placeholder={i18n.translate('xpack.apm.filter.environment.placeholder', {
          defaultMessage: 'Select environment',
        })}
        prepend={i18n.translate('xpack.apm.filter.environment.label', {
          defaultMessage: 'Environment',
        })}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOption}
        onChange={onSelect}
        onSearchChange={onSearch}
        onBlur={onBlur}
        isLoading={status === FETCH_STATUS.LOADING || searchStatus === FETCH_STATUS.LOADING}
      />
    </EuiFormRow>
  );
}
