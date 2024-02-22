/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUES_SELECTED } from '@kbn/exploratory-view-plugin/public';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';

export const useExpViewAttributes = () => {
  const { urlParams, uxUiFilters } = useLegacyUrlParams();

  const { start, end } = urlParams;

  const reportDefinitions = {
    [SERVICE_ENVIRONMENT]:
      !uxUiFilters?.environment ||
      uxUiFilters.environment === ENVIRONMENT_ALL.value
        ? [ALL_VALUES_SELECTED]
        : [uxUiFilters.environment],
    [SERVICE_NAME]: uxUiFilters?.serviceName ?? [ALL_VALUES_SELECTED],
  };

  return {
    reportDefinitions,
    time: {
      from: start ?? '',
      to: end ?? '',
    },
  };
};
