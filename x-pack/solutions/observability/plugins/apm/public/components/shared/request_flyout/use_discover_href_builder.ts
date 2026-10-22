/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { useCallback } from 'react';
import { useApmIndexSettingsContext } from '../../../context/apm_index_settings/use_apm_index_settings_context';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { getESQLQuery, type ESQLQueryParams } from '../links/discover_links/get_esql_query';
import { useRequestFlyoutContext } from './request_flyout_context';

/**
 * Builds the Discover link of a table row. Unlike `useDiscoverHref` it builds one link per call;
 * the links are not available until the APM index settings are loaded.
 */
export function useDiscoverHrefBuilder() {
  const { indexSettings = [], indexSettingsStatus } = useApmIndexSettingsContext();
  const {
    deps: { share },
    filters: { rangeFrom, rangeTo },
  } = useRequestFlyoutContext();

  return useCallback(
    (params: ESQLQueryParams): string | undefined => {
      if (indexSettingsStatus !== FETCH_STATUS.SUCCESS) {
        return undefined;
      }
      const esqlQuery = getESQLQuery({ indexType: 'traces', params, indexSettings });
      if (!esqlQuery) {
        return undefined;
      }
      return share.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
        timeRange: { from: rangeFrom, to: rangeTo },
        query: { esql: esqlQuery },
      });
    },
    [share, indexSettings, indexSettingsStatus, rangeFrom, rangeTo]
  );
}
