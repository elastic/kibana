/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useFetcher } from './useFetcher';
import {
  ENVIRONMENT_NOT_DEFINED,
  ENVIRONMENT_ALL,
} from '../../common/environment_filter_values';
import { callApmApi } from '../services/rest/createCallApmApi';

export const ALL_OPTION = {
  value: ENVIRONMENT_ALL,
  text: i18n.translate('xpack.apm.environment.allLabel', {
    defaultMessage: 'All',
  }),
};

function getEnvironmentOptions(environments: string[]) {
  const environmentOptions = environments
    .filter((env) => env !== ENVIRONMENT_NOT_DEFINED)
    .map((environment) => ({
      value: environment,
      text: environment,
    }));

  return [ALL_OPTION, ...environmentOptions];
}

export function useEnvironments({
  serviceName,
  start,
  end,
}: {
  serviceName?: string;
  start?: string;
  end?: string;
}) {
  const { data: environments = [], status = 'loading' } = useFetcher(() => {
    if (start && end) {
      return callApmApi({
        pathname: '/api/apm/ui_filters/environments',
        params: {
          query: {
            start,
            end,
            serviceName,
          },
        },
      });
    }
  }, [start, end, serviceName]);

  const environmentOptions = useMemo(
    () => getEnvironmentOptions(environments),
    [environments]
  );

  return { environments, status, environmentOptions };
}
