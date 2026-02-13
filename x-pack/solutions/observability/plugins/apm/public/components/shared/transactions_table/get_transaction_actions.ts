/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useMemo } from 'react';
import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { ServiceTransactionGroupItem } from './get_columns';
import type { TableActions } from '../managed_table';
import { getESQLQuery } from '../links/discover_links/get_esql_query';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

interface DiscoverActionParams {
  kuery: string;
  serviceName: string;
  environment: string;
  rangeFrom: string;
  rangeTo: string;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}

export function useTransactionActions({
  kuery,
  serviceName,
  environment,
  rangeFrom,
  rangeTo,
  indexSettings,
}: DiscoverActionParams): TableActions<ServiceTransactionGroupItem> {
  const { share } = useApmPluginContext();

  return useMemo(() => {
    const discoverLocator = share.url.locators.get(DISCOVER_APP_LOCATOR);

    return [
      {
        id: 'discover',
        actions: [
          {
            id: 'transactionsTable-openInDiscover',
            name: i18n.translate('xpack.apm.transactionsTable.openInDiscover', {
              defaultMessage: 'Open in Discover',
            }),
            href: (item) => {
              const esqlQuery = getESQLQuery({
                indexType: 'traces',
                params: {
                  kuery,
                  serviceName,
                  environment,
                  transactionName: item.name,
                  transactionType: item.transactionType,
                },
                indexSettings,
              });

              if (!esqlQuery) return undefined;

              return discoverLocator?.getRedirectUrl({
                timeRange: { from: rangeFrom, to: rangeTo },
                query: { esql: esqlQuery },
              });
            },
          },
        ],
      },
    ];
  }, [share, indexSettings, kuery, serviceName, environment, rangeFrom, rangeTo]);
}
