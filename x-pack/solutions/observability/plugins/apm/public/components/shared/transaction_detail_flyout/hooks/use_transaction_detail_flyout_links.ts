/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  TRANSACTION_DETAILS_BY_NAME_LOCATOR,
  type TransactionDetailsByNameParams,
} from '@kbn/deeplinks-observability';
import { useCallback, useMemo } from 'react';
import { getFlyoutDiscoverNavigation } from '../../service_flyout/utils/get_flyout_discover_navigation';
import { useApmIndices } from '../../service_flyout/hooks/use_apm_indices';
import { useTransactionDetailFlyoutContext } from '../transaction_detail_flyout_context';

export function useTransactionDetailFlyoutLinks() {
  const {
    deps: { core, share },
    contextActions,
    filters: { serviceName, transactionName, transactionType, environment, rangeFrom, rangeTo },
  } = useTransactionDetailFlyoutContext();

  const { indices, loading: indicesLoading } = useApmIndices({ http: core.http });
  const openInNewDiscoverTab = contextActions?.openInNewDiscoverTab;

  const transactionDetailsHref = useMemo(() => {
    const locator = share?.url?.locators?.get<TransactionDetailsByNameParams>(
      TRANSACTION_DETAILS_BY_NAME_LOCATOR
    );
    return locator?.getRedirectUrl({
      serviceName,
      transactionName,
      environment,
      rangeFrom,
      rangeTo,
    });
  }, [share, serviceName, transactionName, environment, rangeFrom, rangeTo]);

  const { href: discoverHref, esqlQuery: discoverEsqlQuery } = getFlyoutDiscoverNavigation({
    share,
    indices,
    indexType: 'traces',
    rangeFrom,
    rangeTo,
    queryParams: {
      serviceName,
      transactionName,
      transactionType,
      environment,
      sortDirection: 'DESC',
    },
  });

  const openInDiscoverTab = useCallback(() => {
    if (!openInNewDiscoverTab || !discoverEsqlQuery) {
      return;
    }
    openInNewDiscoverTab({
      esqlQuery: discoverEsqlQuery,
      timeRange: { from: rangeFrom, to: rangeTo },
      tabLabel: i18n.translate('xpack.apm.transactionDetailFlyout.tracesDiscoverTabLabel', {
        defaultMessage: 'Traces - {transactionName}',
        values: { transactionName },
      }),
    });
  }, [openInNewDiscoverTab, discoverEsqlQuery, rangeFrom, rangeTo, transactionName]);

  return useMemo(
    () => ({
      loading: indicesLoading,
      apm: { transactionDetailsHref },
      discover: {
        href: discoverHref,
        openInDiscoverTab:
          openInNewDiscoverTab && discoverEsqlQuery ? openInDiscoverTab : undefined,
      },
    }),
    [
      indicesLoading,
      transactionDetailsHref,
      discoverHref,
      openInNewDiscoverTab,
      discoverEsqlQuery,
      openInDiscoverTab,
    ]
  );
}
