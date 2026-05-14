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
import { getESQLQuery } from '../../shared/links/discover_links/get_esql_query';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { TableActions } from '../../shared/managed_table';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';

export type TraceGroup = APIReturnType<'GET /internal/apm/traces'>['items'][number];

interface UseTraceActionsParams {
  kuery: string;
  environment: string;
  rangeFrom: string;
  rangeTo: string;
  indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}

export function useTraceActions({
  kuery,
  environment,
  rangeFrom,
  rangeTo,
  indexSettings,
}: UseTraceActionsParams): TableActions<TraceGroup> {
  const { share } = useApmPluginContext();

  return useMemo(() => {
    const discoverLocator = share?.url?.locators?.get(DISCOVER_APP_LOCATOR);

    return [
      {
        id: 'discover',
        actions: [
          {
            id: 'traceList-openInDiscover',
            name: i18n.translate('xpack.apm.tracesTable.exploreTracesInDiscover', {
              defaultMessage: 'Explore traces',
            }),
            href: (item) => {
              if (!discoverLocator) return undefined;

              const { serviceName, transactionName, transactionType } = item;
              if (!serviceName || !transactionName || !transactionType) return undefined;

              const esqlQuery = getESQLQuery({
                indexType: 'traces',
                params: {
                  kuery,
                  environment,
                  serviceName,
                  transactionName,
                  transactionType,
                  sortDirection: 'DESC',
                },
                indexSettings,
              });

              if (!esqlQuery) return undefined;

              return discoverLocator.getRedirectUrl({
                timeRange: { from: rangeFrom, to: rangeTo },
                query: { esql: esqlQuery },
              });
            },
          },
        ],
      },
    ];
  }, [share, indexSettings, kuery, environment, rangeFrom, rangeTo]);
}
