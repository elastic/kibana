/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import { useTrackedPromise } from '../../../utils/use_tracked_promise';
import type { InfraCustomDashboard } from '../../../../common/custom_dashboards';
import { InfraCustomDashboardRT } from '../../../../common/http_api/custom_dashboards_api';
import { throwErrors, createPlainError } from '../../../../common/runtime_types';

export function useUpdateCustomDashboard() {
  const { services } = useKibanaContextForPlugin();

  const decodeResponse = (response: any) => {
    return pipe(
      InfraCustomDashboardRT.decode(response),
      fold(throwErrors(createPlainError), identity)
    );
  };

  const [updateCustomDashboardRequest, updateCustomDashboard] = useTrackedPromise(
    {
      cancelPreviousOn: 'resolution',
      createPromise: async ({ assetType, dashboardIdList }: InfraCustomDashboard) => {
        const rawResponse = await services.http.fetch('/api/infra/custom-dashboards', {
          method: 'POST',
          body: JSON.stringify({
            assetType,
            dashboardIdList,
          }),
        });

        return decodeResponse(rawResponse);
      },
      onResolve: (response) => response,
    },
    []
  );

  const isLoading = useMemo(
    () => updateCustomDashboardRequest.state === 'pending',
    [updateCustomDashboardRequest.state]
  );

  return {
    loading: isLoading,
    updateCustomDashboard,
  };
}
