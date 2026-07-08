/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { Environment } from '../../../../../common/environment_rt';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { useApmRouter } from '../../../../hooks/use_apm_router';
import { useServiceFlyoutContext } from '../service_flyout_context';

interface ServiceLinksParams {
  serviceName: string;
  environment: Environment;
  rangeFrom: string;
  rangeTo: string;
  kuery: string;
}

export function useServiceLinks({
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
  kuery,
}: ServiceLinksParams) {
  const router = useApmRouter();
  const { share } = useServiceFlyoutContext();

  return useMemo(() => {
    const baseQuery = {
      rangeFrom,
      rangeTo,
      environment,
      serviceGroup: '',
      comparisonEnabled: false,
    };

    const overviewHref = share.url.locators
      .get(APM_APP_LOCATOR_ID)
      ?.getRedirectUrl({ serviceName, query: { environment, rangeFrom, rangeTo, kuery } });

    const alertsHref = router.link('/services/{serviceName}/alerts', {
      path: { serviceName },
      query: { ...baseQuery, kuery: '' },
    });

    return { overviewHref, alertsHref };
  }, [router, share, serviceName, environment, rangeFrom, rangeTo, kuery]);
}
