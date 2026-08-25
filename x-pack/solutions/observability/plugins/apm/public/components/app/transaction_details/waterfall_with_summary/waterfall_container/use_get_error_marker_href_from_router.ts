/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useParams } from '@kbn/typed-react-router-config';
import { TRACE_ID, TRANSACTION_ID, type WaterfallGetErrorMarkerHref } from '@kbn/apm-types';
import { ENVIRONMENT_ALL } from '../../../../../../common/environment_filter_values';
import { useApmRouter } from '../../../../../hooks/use_apm_router';

/**
 * Builds error-marker links for the waterfall.
 * Uses the current APM route query when on a matching page; otherwise falls back
 * to the provided time range so the hook works from nested flyouts (e.g. service map).
 */
export function useGetErrorMarkerHrefFromRouter({
  rangeFrom = 'now-15m',
  rangeTo = 'now',
  environment = ENVIRONMENT_ALL.value,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  environment?: string;
} = {}): WaterfallGetErrorMarkerHref {
  const router = useApmRouter();
  const params = useParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation',
    true
  ) as { query: Record<string, unknown> } | undefined;

  const query = params?.query;

  return useCallback(
    ({ serviceName, errorGroupId, traceId, transactionId }) => {
      const kueryParts = [
        traceId && `${TRACE_ID} : "${traceId}"`,
        transactionId && `${TRANSACTION_ID} : "${transactionId}"`,
      ].filter(Boolean);

      const serviceGroup =
        query && 'serviceGroup' in query && typeof query.serviceGroup === 'string'
          ? query.serviceGroup
          : '';

      const baseQuery = query ?? {
        rangeFrom,
        rangeTo,
        environment,
        kuery: '',
        serviceGroup: '',
        comparisonEnabled: false,
      };

      return router.link('/services/{serviceName}/errors/{groupId}', {
        path: { serviceName, groupId: errorGroupId },
        query: {
          ...baseQuery,
          serviceGroup,
          kuery: kueryParts.join(' and '),
        },
      });
    },
    [query, router, rangeFrom, rangeTo, environment]
  );
}
