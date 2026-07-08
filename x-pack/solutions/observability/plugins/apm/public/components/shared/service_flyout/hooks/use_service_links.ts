/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
import { sloListLocatorID } from '@kbn/deeplinks-observability';
import type { Environment } from '../../../../../common/environment_rt';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { getManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
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
  const { share } = useServiceFlyoutContext();

  return useMemo(() => {
    const locator = share.url.locators.get(APM_APP_LOCATOR_ID);

    const overviewHref = locator?.getRedirectUrl({
      serviceName,
      query: { environment, rangeFrom, rangeTo, kuery },
    });

    const alertsHref = locator?.getRedirectUrl({
      serviceName,
      serviceOverviewTab: 'alerts',
      query: { environment, rangeFrom, rangeTo },
    });

    const slosHref = getManageSlosUrl(
      share.url.locators.get<SloListLocatorParams>(sloListLocatorID),
      { serviceName, environment }
    );

    return { overviewHref, alertsHref, slosHref };
  }, [share, serviceName, environment, rangeFrom, rangeTo, kuery]);
}
