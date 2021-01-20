/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../common/environment_filter_values';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { useEnvironmentsContext } from '../../../context/environments/use_enviroments_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';

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

  const {
    availableEnvironments,
    selectedEnvironment,
  } = useEnvironmentsContext();

  // Set the min-width so we don't see as much collapsing of the select during
  // the loading state. 200px is what is looks like if "production" is
  // the contents.
  const minWidth = 200;

  return (
    <EuiSelect
      prepend={i18n.translate('xpack.apm.filter.environment.label', {
        defaultMessage: 'Environment',
      })}
      options={getOptions(availableEnvironments ?? [])}
      value={selectedEnvironment}
      onChange={(event) => {
        updateEnvironmentUrl(history, location, event.target.value);
      }}
      isLoading={status === FETCH_STATUS.LOADING}
      style={{ minWidth }}
    />
  );
}
