/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSelect, EuiFormLabel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useFetcher } from '../../../hooks/useFetcher';
import { loadServiceEnvironments } from '../../../services/rest/apm/services';
import { useLocation } from '../../../hooks/useLocation';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { history } from '../../../utils/history';
import { fromQuery, toQuery } from '../Links/url_helpers';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED
} from '../../../../common/environment_filter_values';

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
      environment: nextEnvironmentQueryParam
    })
  });
}

function getOptions(environments: string[]) {
  const ALL_OPTION = {
    value: ENVIRONMENT_ALL,
    text: i18n.translate('xpack.apm.filter.environment.allLabel', {
      defaultMessage: 'All'
    })
  };

  const NOT_DEFINED_OPTION = {
    value: ENVIRONMENT_NOT_DEFINED,
    text: i18n.translate('xpack.apm.filter.environment.notDefinedLabel', {
      defaultMessage: 'Not defined'
    })
  };

  const hasUndefinedEnv = environments.includes(ENVIRONMENT_NOT_DEFINED);
  const commonOptions = hasUndefinedEnv
    ? [ALL_OPTION, NOT_DEFINED_OPTION]
    : [ALL_OPTION];
  const definedEnvs = environments.filter(
    env => env !== ENVIRONMENT_NOT_DEFINED
  );
  const environmentOptions = definedEnvs.map(environment => ({
    value: environment,
    text: environment
  }));

  return [
    ...commonOptions, // all, not defined
    ...(environmentOptions.length // separate common and environment options
      ? [
          {
            text: `- ${i18n.translate(
              'xpack.apm.filter.environment.selectEnvironmentLabel',
              {
                defaultMessage: 'Select environment'
              }
            )} -`,
            disabled: true
          }
        ]
      : []),
    ...environmentOptions
  ];
}

export const EnvironmentFilter: React.FC = () => {
  const location = useLocation();
  const { urlParams, uiFilters } = useUrlParams();
  const { start, end, serviceName } = urlParams;

  // TODO fix the bug in urlParams that this code defensively overcomes
  let realServiceName = serviceName;
  if (serviceName === 'services') {
    realServiceName = undefined;
  }

  const { environment } = uiFilters;
  const { data: environments = [], status = 'loading' } = useFetcher(
    () => {
      if (start && end) {
        return loadServiceEnvironments({
          start,
          end,
          serviceName: realServiceName
        });
      }
    },
    [start, end, realServiceName]
  );

  return (
    <EuiSelect
      prepend={
        <EuiFormLabel>
          {i18n.translate('xpack.apm.filter.environment.label', {
            defaultMessage: 'environment'
          })}
        </EuiFormLabel>
      }
      options={getOptions(environments)}
      value={environment || ENVIRONMENT_ALL}
      onChange={event => {
        updateEnvironmentUrl(location, event.target.value);
      }}
      isLoading={status === 'loading'}
    />
  );
};
