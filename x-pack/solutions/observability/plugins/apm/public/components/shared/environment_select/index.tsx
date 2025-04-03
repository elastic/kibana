/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import React, { useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import {
  getEnvironmentLabel,
  ENVIRONMENT_NOT_DEFINED,
  ENVIRONMENT_ALL,
} from '../../../../common/environment_filter_values';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import type { Environment } from '../../../../common/environment_rt';

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

  const environments = useMemo(
    () =>
      searchValue !== ''
        ? availableEnvironments.filter((env) =>
            env.toLowerCase().includes(searchValue.toLowerCase())
          )
        : availableEnvironments,
    [searchValue, availableEnvironments]
  );

  const isInvalid = getEnvironmentLabel(environment) !== searchValue && searchValue !== '';

  const options: Array<EuiComboBoxOptionOption<string>> = [...getEnvironmentOptions(environments)];

  return (
    <EuiFormRow
      error={i18n.translate('xpack.apm.filter.environment.error', {
        defaultMessage: '{value} is not a valid environment',
        values: { value: searchValue },
      })}
      css={css`
        min-width: 256px;
      `}
      isInvalid={isInvalid}
    >
      <EuiComboBox
        data-test-subj="environmentFilter"
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
        selectedOptions={selectedOptions}
        onChange={(changedOptions) => onSelect(changedOptions)}
        onSearchChange={setSearchValue}
        isLoading={status === FETCH_STATUS.LOADING}
      />
    </EuiFormRow>
  );
}
