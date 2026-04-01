/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { WaterfallGetServiceBadgeHref } from '../../../../common/waterfall/typings';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';
import { useApmRouter } from '../../../hooks/use_apm_router';

export function useGetServiceBadgeHrefFromRouter(): WaterfallGetServiceBadgeHref {
  const router = useApmRouter();
  const { query } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation',
    '/traces/explorer/waterfall' // TODO remove this url when the trace explorer url and its ftrs tests are removed https://github.com/elastic/kibana/issues/254449
  );

  return useCallback(
    (serviceName: string) => {
      return router.link('/services/{serviceName}/overview', {
        path: { serviceName },
        query: {
          ...query,
          kuery: '',
          serviceGroup: '',
        },
      });
    },
    [query, router]
  );
}
