/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { WaterfallGetErrorMarkerHref } from '@kbn/apm-types';
import { SPAN_ID, TRACE_ID, TRANSACTION_ID } from '../../../../../../common/es_fields/apm';
import { toAnyOfKuery } from '../../../../../../common/utils/kuery_utils';
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
    ({ serviceName, errorGroupId, traceId, transactionId, spanId }) => {
      const kueryParts = [
        traceId && `${TRACE_ID} : "${traceId}"`,
        // OTel-native error documents only carry `span.id`, so fall back to it when the error
        // has no `transaction.id`.
        toAnyOfKuery([
          [TRANSACTION_ID, transactionId],
          [SPAN_ID, spanId],
        ]),
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
