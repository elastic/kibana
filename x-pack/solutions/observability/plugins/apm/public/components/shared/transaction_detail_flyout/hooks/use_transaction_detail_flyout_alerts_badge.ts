/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_ALERTS_LOCATOR_ID,
  type ServiceAlertsLocatorParams,
} from '@kbn/deeplinks-observability';
import { getEnvironmentKuery } from '@kbn/apm-types';
import { useMemo } from 'react';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';

export interface TransactionDetailFlyoutAlertsBadge {
  /** True when the header should render the alerts badge. */
  show: boolean;
  count: number;
  /** Locator href for transaction-scoped alerts; undefined when locators are unavailable. */
  href?: string;
}

/**
 * Resolves visibility and navigation for the transaction detail flyout alerts badge.
 *
 * Count comes from the parent (transactions table). The badge is hidden when the count is
 * missing/zero, the user cannot read alerts, or there is no transaction name to scope alerts to.
 */
export function useTransactionDetailFlyoutAlertsBadge(): TransactionDetailFlyoutAlertsBadge {
  const {
    deps: { core, share },
    filters: { serviceName, transactionName, transactionType, environment, start, end },
    alertsCount,
  } = useTransactionDetailFlyoutContext();

  const { canReadAlerts } = getAlertingCapabilities({}, core.application.capabilities);

  return useMemo(() => {
    const count = alertsCount ?? 0;
    const show = canReadAlerts && Boolean(transactionName) && count > 0;

    if (!show) {
      return { show: false, count: 0 };
    }

    const environmentKuery = getEnvironmentKuery(environment)?.trim() || undefined;

    const href = share?.url?.locators
      ?.get<ServiceAlertsLocatorParams>(SERVICE_ALERTS_LOCATOR_ID)
      ?.getRedirectUrl({
        serviceName,
        transactionName,
        transactionType,
        // Prefer absolute bounds so the alerts page matches the flyout window.
        rangeFrom: start,
        rangeTo: end,
        ...(environmentKuery ? { kuery: environmentKuery } : {}),
      });

    return { show: true, count, href };
  }, [
    alertsCount,
    canReadAlerts,
    share,
    serviceName,
    transactionName,
    transactionType,
    environment,
    start,
    end,
  ]);
}
