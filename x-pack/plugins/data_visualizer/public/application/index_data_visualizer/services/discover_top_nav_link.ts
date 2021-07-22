/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import {
  fromKueryExpression,
  toElasticsearchQuery,
  luceneStringToDsl,
  decorateQuery,
} from '@kbn/es-query';
import {
  RefreshInterval,
  SerializableState,
  UI_SETTINGS,
} from '../../../../../../../src/plugins/data/common';
import { IndexDataVisualizerLocator } from '../locator';
import { isPopulatedObject } from '../../../../common/utils/object_utils';
import type { DiscoverSetup } from '../../../../../../../src/plugins/discover/public';
import { SEARCH_QUERY_LANGUAGE } from '../types/combined_query';

export const DISCOVER_DV_TOP_NAV_LINK_ID = 'indexDataVisualizer';

export class DiscoverNavLinkRegistrar {
  private readonly locator?: IndexDataVisualizerLocator;
  public readonly id = DISCOVER_DV_TOP_NAV_LINK_ID;

  constructor(locator: IndexDataVisualizerLocator) {
    this.locator = locator;
  }

  registerDiscoverTopNavLink: Parameters<
    DiscoverSetup['addData']['registerTopNavLinkGetter']
  >[1] = async (args) => {
    if (!this.locator) {
      throw Error('IndexDataVisualizerLocator not available');
    }
    if (!isPopulatedObject(args)) {
      throw Error('Invalid arguments');
    }

    return {
      id: DISCOVER_DV_TOP_NAV_LINK_ID,
      label: i18n.translate('discover.localMenu.dataVisualizerTitle', {
        defaultMessage: 'Data visualizer',
      }),
      description: i18n.translate('discover.localMenu.dataVisualizerDescription', {
        defaultMessage: 'Open in Data visualizer',
      }),
      testId: 'dataVisualizerTopNavButton',
      run: async () => {
        const { stateContainer, services, indexPattern, savedSearch, columns } = args;
        const extractedQuery = stateContainer.appStateContainer.getState().query;
        const timeRange = services.timefilter.getTime();
        const refreshInterval = services.timefilter.getRefreshInterval() as RefreshInterval &
          SerializableState;
        const params: SerializableState = {
          indexPatternId: indexPattern.id,
          savedSearchId: savedSearch.id,
          timeRange,
          refreshInterval,
        };

        if (columns) {
          params.visibleFieldNames = columns;
        }
        if (extractedQuery) {
          const queryLanguage = extractedQuery.language;
          const qryString = extractedQuery.query;
          let qry;
          if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
            const ast = fromKueryExpression(qryString);
            qry = toElasticsearchQuery(ast, indexPattern);
          } else {
            qry = luceneStringToDsl(qryString);
            decorateQuery(qry, services.uiSettings.get(UI_SETTINGS.QUERY_STRING_OPTIONS));
          }

          params.query = {
            searchQuery: qry as SerializableState,
            searchString: qryString,
            searchQueryLanguage: queryLanguage,
          };
        }

        const url = await this.locator?.getUrl(params, { absolute: true });

        // We want to open the Data visualizer in a new tab
        if (url !== undefined) {
          window.open(url, '_blank');
        }
      },
    };
  };
}
