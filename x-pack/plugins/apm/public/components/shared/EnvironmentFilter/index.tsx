/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import { useEnvironments } from '../../../hooks/useEnvironments';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';

function updateEnvironmentUrl(
  history: History,
  location: ReturnType<typeof useLocation>,
  environment?: string
) {
  const nextEnvironmentQueryParam =
    environment !== ENVIRONMENT_ALL.value ? environment : undefined;
  history.push({
    ...location,
    search: fromQuery({
      ...toQuery(location.search),
      environment: nextEnvironmentQueryParam,
    }),
  });
}

const SEPARATOR_OPTION = {
  text: `- ${i18n.translate(
    'xpack.apm.filter.environment.selectEnvironmentLabel',
    { defaultMessage: 'Select environment' }
  )} -`,
  disabled: true,
};

function getOptions(environments: string[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED.value)
    .map((environment) => ({
      value: environment,
      text: environment,
    }));

  return [
    ENVIRONMENT_ALL,
    ...(environments.includes(ENVIRONMENT_NOT_DEFINED.value)
      ? [ENVIRONMENT_NOT_DEFINED]
      : []),
    ...(environmentOptions.length > 0 ? [SEPARATOR_OPTION] : []),
    ...environmentOptions,
  ];
}

export function EnvironmentFilter() {
  const history = useHistory();
  const location = useLocation();
  const { uiFilters, urlParams } = useUrlParams();

  const { environment } = uiFilters;
  const { serviceName, start, end } = urlParams;
  const { environments, status = 'loading' } = useEnvironments({
    serviceName,
    start,
    end,
  });

  return (
    <EuiSelect
      prepend={i18n.translate('xpack.apm.filter.environment.label', {
        defaultMessage: 'environment',
      })}
      options={getOptions(environments)}
      value={environment || ENVIRONMENT_ALL.value}
      onChange={(event) => {
        updateEnvironmentUrl(history, location, event.target.value);
      }}
      isLoading={status === 'loading'}
    />
  );
}
