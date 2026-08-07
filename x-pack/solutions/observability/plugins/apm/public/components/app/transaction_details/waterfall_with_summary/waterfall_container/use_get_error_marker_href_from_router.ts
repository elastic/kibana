/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { TRACE_ID, TRANSACTION_ID, type WaterfallGetErrorMarkerHref } from '@kbn/apm-types';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useApmRouter } from '../../../../../hooks/use_apm_router';

export function useGetErrorMarkerHrefFromRouter(): WaterfallGetErrorMarkerHref {
  const router = useApmRouter();
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );

  const serviceGroup = 'serviceGroup' in query ? query.serviceGroup : '';

  return useCallback(
    ({ serviceName, errorGroupId, traceId, transactionId }) => {
      const kueryParts = [
        traceId && `${TRACE_ID} : "${traceId}"`,
        transactionId && `${TRANSACTION_ID} : "${transactionId}"`,
      ].filter(Boolean);

      return router.link('/services/{serviceName}/errors/{groupId}', {
        path: { serviceName, groupId: errorGroupId },
        query: {
          ...query,
          serviceGroup,
          kuery: kueryParts.join(' and '),
        },
      });
    },
    [query, router, serviceGroup]
  );
}
