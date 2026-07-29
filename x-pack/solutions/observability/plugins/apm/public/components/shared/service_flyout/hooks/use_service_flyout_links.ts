/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
import { sloListLocatorID } from '@kbn/deeplinks-observability';
import { APM_APP_LOCATOR_ID } from '../../../../locator/service_detail_locator';
import { getManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useServiceFlyoutContext } from '../service_flyout_context';
import { useAlertsHref } from '../footer/hooks/use_alerts_href';
import { useFlyoutDiscoverNavigation } from './use_flyout_discover_navigation';

export function useServiceFlyoutLinks() {
  const {
    deps: { core, share },
    contextActions,
    service,
    indices,
    filters: { environment, rangeFrom, rangeTo, transactionType = '' },
  } = useServiceFlyoutContext();
  const serviceName = service.name;
  const canReadSlos = !!core.application?.capabilities?.slo?.read;
  const { openInNewDiscoverTab } = contextActions ?? {};

  const apm = useMemo(() => {
    const locator = share?.url?.locators?.get(APM_APP_LOCATOR_ID);
    return {
      overviewTab: locator?.getRedirectUrl({
        serviceName,
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

  const { href: tracesHref, esqlQuery: tracesEsqlQuery } = useFlyoutDiscoverNavigation({
    share,
    indices,
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: { serviceName, transactionType, environment, sortDirection: 'DESC' },
  });

  const { href: logsHref, esqlQuery: logsEsqlQuery } = useFlyoutDiscoverNavigation({
    share,
    indices,
    indexType: 'error',
    rangeFrom,
    rangeTo,
    queryParams: { serviceName, environment, sortDirection: 'DESC' },
  });

  const tracesOpenInDiscoverTab =
    openInNewDiscoverTab && tracesEsqlQuery
      ? () =>
          openInNewDiscoverTab({
            esqlQuery: tracesEsqlQuery,
            timeRange: { from: rangeFrom, to: rangeTo },
            tabLabel: i18n.translate('xpack.apm.serviceFlyout.tracesDiscoverTabLabel', {
              defaultMessage: 'Traces - {serviceName}',
              values: { serviceName },
            }),
          })
      : undefined;

  const logsOpenInDiscoverTab =
    openInNewDiscoverTab && logsEsqlQuery
      ? () =>
          openInNewDiscoverTab({
            esqlQuery: logsEsqlQuery,
            timeRange: { from: rangeFrom, to: rangeTo },
            tabLabel: i18n.translate('xpack.apm.serviceFlyout.logsDiscoverTabLabel', {
              defaultMessage: 'Logs - {serviceName}',
              values: { serviceName },
            }),
          })
      : undefined;

  return {
    apm,
    alerts,
    slos,
    discover: {
      traces: { href: tracesHref, openInDiscoverTab: tracesOpenInDiscoverTab },
      logs: { href: logsHref, openInDiscoverTab: logsOpenInDiscoverTab },
    },
  };
}
