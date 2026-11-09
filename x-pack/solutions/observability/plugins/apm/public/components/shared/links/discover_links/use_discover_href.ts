/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getESQLQuery, getESQLQueryFromIndexPattern } from './get_esql_query';
import type { DiscoverIndexSource, ESQLQueryParams } from './get_esql_query';

export function useDiscoverHref({
  rangeFrom,
  rangeTo,
  queryParams,
  ...source
}: DiscoverIndexSource & {
  rangeFrom: string;
  rangeTo: string;
  queryParams: ESQLQueryParams;
}): string | undefined {
  const { share } = useApmPluginContext();
  const { indexSettings = [], indexSettingsStatus } = useApmIndexSettingsContext();

  let esqlQuery: string | null = null;

  if (source.indexType === 'logs') {
    // The log-sources pattern comes from logSourcesService, not apmIndexSettings.
    // Its fetch status is independent and must not gate this branch.
    esqlQuery = source.indexPattern
      ? getESQLQueryFromIndexPattern({ indexPattern: source.indexPattern, params: queryParams })
      : null;
  } else if (indexSettingsStatus === FETCH_STATUS.SUCCESS) {
    esqlQuery = getESQLQuery({ indexType: source.indexType, params: queryParams, indexSettings });
  }

  if (!esqlQuery) {
    return undefined;
  }

  return share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: { from: rangeFrom, to: rangeTo },
    query: { esql: esqlQuery },
  });
}
