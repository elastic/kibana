/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import type { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import { getESQLQuery } from '../../links/discover_links/get_esql_query';
import type { ESQLQueryParams, IndexType } from '../../links/discover_links/get_esql_query';

function toIndexSettings(indices: APMIndices) {
  return [
    {
      configurationName: 'transaction' as const,
      defaultValue: indices.transaction,
      savedValue: undefined,
    },
    {
      configurationName: 'span' as const,
      defaultValue: indices.span,
      savedValue: undefined,
    },
    {
      configurationName: 'error' as const,
      defaultValue: indices.error,
      savedValue: undefined,
    },
  ];
}

export function getFlyoutDiscoverNavigation({
  share,
  indices,
  indexType,
  rangeFrom,
  rangeTo,
  queryParams,
}: {
  share: SharePublicStart | undefined;
  indices: APMIndices | undefined;
  indexType: IndexType;
  rangeFrom: string;
  rangeTo: string;
  queryParams: ESQLQueryParams;
}): { href: string | undefined; esqlQuery: string | null } {
  if (!indices) {
    return { href: undefined, esqlQuery: null };
  }

  const indexSettings = toIndexSettings(indices);

  const esqlQuery = getESQLQuery({
    indexType,
    params: queryParams,
    indexSettings,
  });

  if (!esqlQuery) {
    return { href: undefined, esqlQuery: null };
  }

  const href = share?.url.locators.get(DISCOVER_APP_LOCATOR)?.getRedirectUrl({
    timeRange: { from: rangeFrom, to: rangeTo },
    query: { esql: esqlQuery },
  });

  return { href, esqlQuery };
}
