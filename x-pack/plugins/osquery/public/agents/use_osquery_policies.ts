/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { useQuery } from 'react-query';
import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../common/lib/kibana';
import { packagePolicyRouteService, PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../fleet/common';
import { OSQUERY_INTEGRATION_NAME } from '../../common';
import { useErrorToast } from '../common/hooks/use_error_toast';

export const useOsqueryPolicies = () => {
  const { http } = useKibana().services;
  const setErrorToast = useErrorToast();

  const { isLoading: osqueryPoliciesLoading, data: osqueryPolicies = [] } = useQuery(
    ['osqueryPolicies'],
    () =>
      http.get(packagePolicyRouteService.getListPath(), {
        query: {
          kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${OSQUERY_INTEGRATION_NAME}`,
        },
      }),
    {
      select: (response) =>
        uniq<string>(response.items.map((p: { policy_id: string }) => p.policy_id)),
      onSuccess: () => setErrorToast(),
      onError: (error: Error) =>
        setErrorToast(error, {
          title: i18n.translate('xpack.osquery.osquery_policies.fetchError', {
            defaultMessage: 'Error while fetching osquery policies',
          }),
        }),
    }
  );
  return useMemo(() => ({ osqueryPoliciesLoading, osqueryPolicies }), [
    osqueryPoliciesLoading,
    osqueryPolicies,
  ]);
};
