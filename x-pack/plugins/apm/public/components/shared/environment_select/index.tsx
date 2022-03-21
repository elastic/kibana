/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useState, useCallback } from 'react';
import { throttle } from 'lodash';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import { useEnvironmentCustomOptions } from '../../../hooks/use_environment_custom_options';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { useEnvironmentsContext } from '../../../context/environments_context/use_environments_context';

export function EnvironmentSelect({
  onChange,
}: {
  onChange: (value?: string) => void;
}) {
  let defaultOption: EuiComboBoxOptionOption<string> | undefined;
  const {
    setFieldValue,
    environment,
    serviceName,
    environmentOptions,
    start,
    end,
    status,
  } = useEnvironmentsContext();

  const customOptions = useEnvironmentCustomOptions({
    serviceName,
    start,
    end,
  });

  if (environment) {
    defaultOption = {
      value: environment,
      label: getEnvironmentLabel(environment),
    };
  }

  const [selectedOptions, setSelectedOptions] = useState(
    defaultOption ? [defaultOption] : []
  );

  const options: Array<EuiComboBoxOptionOption<string>> = [
    ...(customOptions ? customOptions : []),
    ...environmentOptions,
  ];

  const handleChange = useCallback(
    (changedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedOptions(changedOptions);

      if (changedOptions.length === 1) {
        const [selectedOption] = changedOptions;
        onChange(selectedOption.value);
      }
    },
    [onChange]
  );

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
      onSearchChange={throttle(setFieldValue, 500)}
      isLoading={status === FETCH_STATUS.LOADING}
    />
  );
}
