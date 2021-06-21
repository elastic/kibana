/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import React from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import { useEnvironmentsFetcher } from '../../../hooks/use_environments_fetcher';
import { useUrlParams } from '../../../context/url_params_context/use_url_params';
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
  const { serviceName } = useParams<{ serviceName?: string }>();
  const { urlParams } = useUrlParams();

  const { environment, start, end } = urlParams;
  const { environments, status = 'loading' } = useEnvironmentsFetcher({
    serviceName,
    start,
    end,
  });

  // Set the min-width so we don't see as much collapsing of the select during
  // the loading state. 200px is what is looks like if "production" is
  // the contents.
  const minWidth = 200;

  const options = getOptions(environments);

  return (
    <EuiSelect
      prepend={i18n.translate('xpack.apm.filter.environment.label', {
        defaultMessage: 'Environment',
      })}
      options={options}
      value={environment || ENVIRONMENT_ALL.value}
      onChange={(event) => {
        updateEnvironmentUrl(history, location, event.target.value);
      }}
      isLoading={status === 'loading'}
      style={{ minWidth }}
    />
  );
}
