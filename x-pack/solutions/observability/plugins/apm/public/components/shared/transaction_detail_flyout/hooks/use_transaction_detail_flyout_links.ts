/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
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

  const openInDiscoverTab =
    contextActions?.openInNewDiscoverTab && discoverEsqlQuery
      ? () =>
          contextActions.openInNewDiscoverTab!({
            esqlQuery: discoverEsqlQuery,
            timeRange: { from: rangeFrom, to: rangeTo },
            tabLabel: i18n.translate('xpack.apm.transactionDetailFlyout.tracesDiscoverTabLabel', {
              defaultMessage: 'Traces - {transactionName}',
              values: { transactionName },
            }),
          })
      : undefined;

  return {
    loading: indicesLoading,
    discover: { href: discoverHref, openInDiscoverTab },
  };
}
