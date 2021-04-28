/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { find } from 'lodash/fp';
import { useQuery } from 'react-query';

import { GetPackagesResponse, epmRouteService } from '../../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';
import { useKibana } from '../lib/kibana';

export const useOsqueryIntegration = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  return useQuery(
    'integrations',
    () =>
      http.get(epmRouteService.getListPath(), {
        query: {
          experimental: true,
        },
      }),
    {
      select: ({ response }: GetPackagesResponse) =>
        find(['name', OSQUERY_INTEGRATION_NAME], response),
      onError: (error: Error) =>
        toasts.addError(error, {
          title: i18n.translate('xpack.osquery.osquery_integration.fetchError', {
            defaultMessage: 'Error while fetching osquery integration',
          }),
        }),
    }
  );
};
