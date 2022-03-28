/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { getEnvironmentLabel } from '../../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../../common/elasticsearch_fieldnames';
import { Environment } from '../../../../common/environment_rt';
import { SuggestionsSelect } from '../suggestions_select';
import { useEnvironmentCustomOptions } from '../../../hooks/use_environment_custom_options';

export function EnvironmentSelect({
  environment,
  prepend,
  onChange,
  hasNotDefinedEnvironment,
  start,
  end,
}: {
  environment: Environment;
  prepend?: string;
  onChange: (value: string) => void;
  hasNotDefinedEnvironment?: boolean;
  start?: number;
  end?: number;
}) {
  const customOptions = useEnvironmentCustomOptions({ start, end });

  return (
    <SuggestionsSelect
      isClearable={false}
      customOptions={customOptions}
      placeholder={i18n.translate('xpack.apm.filter.environment.placeholder', {
        defaultMessage: 'Select environment',
      })}
      prepend={prepend}
      onChange={onChange}
      defaultValue={getEnvironmentLabel(environment)}
      fieldName={SERVICE_ENVIRONMENT}
      start={start}
      end={end}
      data-test-subj="environmentFilter"
    />
  );
}
