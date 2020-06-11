/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { history } from '../../../utils/history';
import { fromQuery, toQuery } from '../Links/url_helpers';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import { useEnvironments, ALL_OPTION } from '../../../hooks/useEnvironments';

function updateEnvironmentUrl(
  location: ReturnType<typeof useLocation>,
  environment?: string
) {
  const nextEnvironmentQueryParam =
    environment !== ENVIRONMENT_ALL ? environment : undefined;
  history.push({
    ...location,
    search: fromQuery({
      ...toQuery(location.search),
      environment: nextEnvironmentQueryParam,
    }),
  });
}

const NOT_DEFINED_OPTION = {
  value: ENVIRONMENT_NOT_DEFINED,
  text: i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
    defaultMessage: 'Not defined',
  }),
};

const SEPARATOR_OPTION = {
  text: `- ${i18n.translate(
    'xpack.apm.filter.environment.selectEnvironmentLabel',
    { defaultMessage: 'Select environment' }
  )} -`,
  disabled: true,
};

function getOptions(environments: string[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED)
    .map((environment) => ({
      value: environment,
      text: environment,
    }));

  return [
    ALL_OPTION,
    ...(environments.includes(ENVIRONMENT_NOT_DEFINED)
      ? [NOT_DEFINED_OPTION]
      : []),
    ...(environmentOptions.length > 0 ? [SEPARATOR_OPTION] : []),
    ...environmentOptions,
  ];
}

export const EnvironmentFilter: React.FC = () => {
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
      value={environment || ENVIRONMENT_ALL}
      onChange={(event) => {
        updateEnvironmentUrl(location, event.target.value);
      }}
      isLoading={status === 'loading'}
    />
  );
};
