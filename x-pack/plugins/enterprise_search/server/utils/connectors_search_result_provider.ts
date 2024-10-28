/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, takeUntil, switchMap, of } from 'rxjs';

import type { IStaticAssets } from '@kbn/core-http-browser';

import {
  GlobalSearchProviderResult,
  GlobalSearchResultProvider,
} from '@kbn/global-search-plugin/server';
import { i18n } from '@kbn/i18n';

import { fetchConnectors } from '@kbn/search-connectors';

import { ENTERPRISE_SEARCH_CONTENT_PLUGIN } from '../../common/constants';

import { calculateScore } from './calculate_search_score';

export function getConnectorsSearchResultProvider(
  staticAssets: IStaticAssets
): GlobalSearchResultProvider {
  return {
    find: ({ term, types, tags }, { aborted$, client, maxResults }, { core: { capabilities } }) => {
      if (!client || !term || tags || (types && !types.includes('connector'))) {
        return from([[]]);
      }
      const getConnectorData = async (): Promise<GlobalSearchProviderResult[]> => {
        const connectorData = await fetchConnectors(client.asCurrentUser, undefined, false, term);
        const searchResults: GlobalSearchProviderResult[] = connectorData
          .map(({ name, id }) => {
            const score = calculateScore(term, name);
            return {
              icon: staticAssets.getPluginAssetHref('images/connector.svg'),
              id: name,
              score,
              title: name,
              type: i18n.translate('xpack.enterpriseSearch.searchConnectorProvider.type.name', {
                defaultMessage: 'Connector',
              }),
              url: {
                path: `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/connectors/${id}`,
                prependBasePath: true,
              },
            };
          })
          .filter((result) => result.score > 0)
          .slice(0, maxResults);
        return searchResults;
      };

      return capabilities.pipe(
        takeUntil(aborted$),
        switchMap((caps) => {
          if (!caps.catalogue.enterpriseSearch) {
            return of([]);
          }

          return from(getConnectorData());
        })
      );
    },
    getSearchableTypes: () => ['connector'],
    id: 'enterpriseSearchConnectors',
  };
}
