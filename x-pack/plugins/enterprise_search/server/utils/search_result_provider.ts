/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from, takeUntil } from 'rxjs';

import { IBasePath } from '@kbn/core-http-server';
import { GlobalSearchResultProvider } from '@kbn/global-search-plugin/server';
import { i18n } from '@kbn/i18n';

import { ConfigType } from '..';
import {
  CONNECTOR_DEFINITIONS,
  ConnectorServerSideDefinition,
} from '../../common/connectors/connectors';
import {
  ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
  ENTERPRISE_SEARCH_CONTENT_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
  ESRE_PLUGIN,
} from '../../common/constants';

type ServiceDefinition =
  | ConnectorServerSideDefinition
  | {
      iconPath?: string;
      keywords: string[];
      name: string;
      serviceType: string;
      url?: string;
    };

export function toSearchResult({
  basePath,
  iconPath,
  name,
  score,
  serviceType,
  url,
}: {
  basePath: IBasePath;
  iconPath?: string;
  name: string;
  score: number;
  serviceType: string;
  url?: string;
}) {
  return {
    icon: iconPath
      ? basePath.prepend(`/plugins/enterpriseSearch/assets/source_icons/${iconPath}`)
      : 'logoEnterpriseSearch',
    id: serviceType,
    score,
    title: name,
    type: i18n.translate('xpack.enterpriseSearch.searchProvider.type.name', {
      defaultMessage: 'Search',
    }),
    url: {
      path:
        url ??
        `${ENTERPRISE_SEARCH_CONTENT_PLUGIN.URL}/search_indices/new_index/${
          serviceType === ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
            ? 'crawler'
            : `connector?service_type=${serviceType}`
        }`,
      prependBasePath: true,
    },
  };
}

export function getSearchResultProvider(
  basePath: IBasePath,
  config: ConfigType
): GlobalSearchResultProvider {
  return {
    find: ({ term, types, tags }, { aborted$, maxResults }) => {
      if (
        tags ||
        (types && !(types.includes('integration') || types.includes('enterprise search')))
      ) {
        return from([[]]);
      }
      const services: ServiceDefinition[] = [
        ...(config.hasWebCrawler
          ? [
              {
                iconPath: 'crawler.svg',
                keywords: ['crawler', 'web', 'website', 'internet', 'google'],
                name: i18n.translate('xpack.enterpriseSearch.searchProvider.webCrawler.name', {
                  defaultMessage: 'Elastic Web Crawler',
                }),
                serviceType: ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE,
              },
            ]
          : []),
        ...(config.hasConnectors ? CONNECTOR_DEFINITIONS : []),
        ...[
          {
            keywords: ['app', 'search', 'engines'],
            name: i18n.translate('xpack.enterpriseSearch.searchProvider.appSearch.name', {
              defaultMessage: 'App Search',
            }),
            serviceType: 'app_search',
            url: APP_SEARCH_PLUGIN.URL,
          },
          {
            keywords: ['workplace', 'search'],
            name: i18n.translate('xpack.enterpriseSearch.searchProvider.workplaceSearch.name', {
              defaultMessage: 'Workplace Search',
            }),
            serviceType: 'workplace_search',
            url: WORKPLACE_SEARCH_PLUGIN.URL,
          },
          {
            keywords: ['esre', 'search'],
            name: i18n.translate('xpack.enterpriseSearch.searchProvider.esre.name', {
              defaultMessage: 'ESRE',
            }),
            serviceType: 'esre',
            url: ESRE_PLUGIN.URL,
          },
        ],
      ];
      const result = services
        .map((service) => {
          const { iconPath, keywords, name, serviceType } = service;
          const url = 'url' in service ? service.url : undefined;
          let score = 0;
          const searchTerm = (term || '').toLowerCase();
          const searchName = name.toLowerCase();
          if (!searchTerm) {
            score = 80;
          } else if (searchName === searchTerm) {
            score = 100;
          } else if (searchName.startsWith(searchTerm)) {
            score = 90;
          } else if (searchName.includes(searchTerm)) {
            score = 75;
          } else if (serviceType === searchTerm) {
            score = 65;
          } else if (keywords.some((keyword) => keyword.includes(searchTerm))) {
            score = 50;
          }
          return toSearchResult({ basePath, iconPath, name, score, serviceType, url });
        })
        .filter(({ score }) => score > 0)
        .slice(0, maxResults);
      return from([result]).pipe(takeUntil(aborted$));
    },
    getSearchableTypes: () => ['enterprise search', 'integration'],
    id: 'enterpriseSearch',
  };
}
