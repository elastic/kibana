/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { WaterfallGetServiceBadgeHref } from '../../../../common/waterfall/typings';

export function useGetServiceBadgeHrefFromCore(
  core: CoreStart,
  rangeFrom: string,
  rangeTo: string
): WaterfallGetServiceBadgeHref {
  return useCallback(
    (serviceName: string) => {
      const queryParams = new URLSearchParams({ rangeFrom, rangeTo });
      return core.application.getUrlForApp('apm', {
        path: `/services/${encodeURIComponent(serviceName)}/overview?${queryParams.toString()}`,
      });
    },
    [core, rangeFrom, rangeTo]
  );
}
