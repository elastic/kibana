/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
import { sloListLocatorID } from '@kbn/deeplinks-observability';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { getManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { useAlertsHref } from '../footer/hooks/use_alerts_href';
import { useDiscoverHref } from '../../links/discover_links/use_discover_href';

export function useServiceFlyoutLinks() {
  const {
    deps: { core, share },
    service,
    filters: { environment, rangeFrom, rangeTo, transactionType = '' },
  } = useServiceFlyoutContext();
  const serviceName = service.name;
  const canReadSlos = !!core.application?.capabilities?.slo?.read;

  const apm = useMemo(() => {
    const locator = share?.url?.locators?.get(APM_APP_LOCATOR_ID);
    return {
      overviewTab: locator?.getRedirectUrl({
        serviceName,
        query: { environment, rangeFrom, rangeTo },
      }),
      alertsTab: locator?.getRedirectUrl({
        serviceName,
        serviceOverviewTab: 'alerts',
        query: { environment, rangeFrom, rangeTo },
      }),
    };
  }, [share, serviceName, environment, rangeFrom, rangeTo]);

  const slos = useMemo(
    () =>
      canReadSlos
        ? getManageSlosUrl(share?.url?.locators?.get<SloListLocatorParams>(sloListLocatorID), {
            serviceName,
            environment,
          })
        : undefined,
    [canReadSlos, share, serviceName, environment]
  );

  const alerts = useAlertsHref();

  const tracesDiscover = useDiscoverHref({
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: { serviceName, transactionType, environment, sortDirection: 'DESC' },
  });

  const logsDiscover = useDiscoverHref({
    indexType: 'error',
    rangeFrom,
    rangeTo,
    queryParams: { serviceName, environment, sortDirection: 'DESC' },
  });

  return {
    apm,
    alerts,
    slos,
    discover: {
      traces: tracesDiscover,
      logs: logsDiscover,
    },
  };
}
