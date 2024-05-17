/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { uniq } from 'lodash';
import { API_VERSIONS } from '../../common/constants';
import { useErrorToast } from '../common/hooks/use_error_toast';
import { useKibana } from '../common/lib/kibana';

export const useOsqueryPolicies = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  return useQuery(
    ['osqueryPolicies'],
    () =>
      http.get<{ items: Array<{ policy_id: string }> }>(
        '/internal/osquery/fleet_wrapper/package_policies',
        { version: API_VERSIONS.internal.v1 }
      ),
    {
      select: (response) => uniq<string>(response.items.map((p) => p.policy_id)),
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.osquery_policies.fetchError', {
            defaultMessage: 'Error while fetching osquery policies',
          }),
        }),
    }
  );
};
