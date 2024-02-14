/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { debounce } from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { EuiButtonGroup, EuiCode, EuiFlexGroup, EuiFlexItem, EuiInputPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query } from '@kbn/es-query';
import type { QueryErrorMessage } from '@kbn/ml-error-utils';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';

import { PLUGIN_ID } from '../../../../../../../common/constants/app';
import type { Dictionary } from '../../../../../../../common/types/common';
import { removeFilterFromQueryString } from '../../../../../explorer/explorer_utils';
import { useMlKibana } from '../../../../../contexts/kibana';

export interface ExplorationQueryBarProps {
  dataView: DataView;
  setSearchQuery: (update: {
    queryString: string;
    query?: estypes.QueryDslQueryContainer;
    language: SearchQueryLanguage;
  }) => void;
  includeQueryString?: boolean;
  query: Query;
  filters?: {
    options: Array<{ id: string; label: string }>;
    columnId: string;
    key: Dictionary<boolean>;
  };
}

export const ExplorationQueryBar: FC<ExplorationQueryBarProps> = ({
  dataView,
  setSearchQuery,
  filters,
  query,
}) => {
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>(query);
  const [idToSelectedMap, setIdToSelectedMap] = useState<{ [id: string]: boolean }>({});
  const [queryErrorMessage, setQueryErrorMessage] = useState<QueryErrorMessage | undefined>(
    undefined
  );

  const { services } = useMlKibana();
  const {
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = services;

  const searchChangeHandler = (q: Query) => setSearchInput(q);

  const regex = useMemo(
    () => new RegExp(`${filters?.columnId}\\s*:\\s*(true|false)`, 'g'),
    [filters?.columnId]
  );

  /**
   * Restoring state from the URL once on load. If a filter option is active
   * in the url set the corresponding options button to selected mode.
   */
  useEffect(function updateIdToSelectedMap() {
    if (filters !== undefined) {
      const match: string[] | null = query.query.match(regex);
      let filterKeyInEffect: string | undefined;

      if (match !== null && match[0].includes('true')) {
        // set { training: true }
        filterKeyInEffect = Object.keys(filters.key).find((i) => filters.key[i] === true);
      } else if (match !== null && match[0].includes('false')) {
        // set { testing: true }
        filterKeyInEffect = Object.keys(filters.key).find((i) => filters.key[i] === false);
      }

      if (filterKeyInEffect) {
        setIdToSelectedMap({ [filterKeyInEffect]: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Component is responsible for parsing the query string,
   * hence it should sync submitted query string.
   */
  useEffect(() => {
    try {
      let convertedQuery: estypes.QueryDslQueryContainer = {};
      switch (query.language) {
        case SEARCH_QUERY_LANGUAGE.KUERY:
          convertedQuery = toElasticsearchQuery(
            fromKueryExpression(query.query as string),
            dataView
          );
          break;
        case SEARCH_QUERY_LANGUAGE.LUCENE:
          convertedQuery = luceneStringToDsl(query.query as string);
          break;
        default:
          setQueryErrorMessage({
            query: query.query as string,
            message: i18n.translate('xpack.ml.queryBar.queryLanguageNotSupported', {
              defaultMessage: 'Query language is not supported',
            }),
          });
          return;
      }
      setSearchQuery({
        queryString: query.query as string,
        query: convertedQuery,
        language: query.language,
      });
    } catch (e) {
      setQueryErrorMessage({ query: query.query as string, message: e.message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.query]);

  const searchSubmitHandler = (q: Query, filtering?: boolean) => {
    // If moved to querying manually, clear filter selection.
    if (filtering === undefined) {
      setIdToSelectedMap({});
    }

    setSearchQuery({
      queryString: q.query as string,
      language: q.language as SearchQueryLanguage,
    });
  };

  const debouncedHandleFilterUpdate = debounce((optionId: string, currentIdToSelectedMap: any) => {
    let newQuery = '';
    const filterValue = filters?.key[optionId];
    const filterQueryString = `${filters?.columnId}:${filterValue}`;

    // Toggling selected optionId to 'off' - remove column id query from filter
    if (currentIdToSelectedMap[optionId] === false) {
      newQuery =
        searchInput.query !== ''
          ? removeFilterFromQueryString(
              searchInput.query as string,
              filters?.columnId!,
              String(filterValue)
            )
          : '';
    } else if (currentIdToSelectedMap[optionId] === true) {
      // Toggling selected optionId to 'on'
      if (searchInput.query === '') {
        newQuery = filterQueryString;
      } else if (searchInput.query.match(regex) !== null) {
        // If query already contains columnId filter - replace with incoming value from filter selection
        newQuery = searchInput.query.replace(regex, filterQueryString);
      } else {
        // Otherwise just add filter query to the end of existing query
        newQuery = `${searchInput.query} and ${filterQueryString}`;
      }
    }
    // Add the filter query to the search input and setSearchQuery
    const newSearchInput = { ...searchInput, query: newQuery };

    setSearchInput(newSearchInput);
    searchSubmitHandler(newSearchInput, true);
  }, 200);

  return (
    <EuiInputPopover
      style={{ maxWidth: '100%' }}
      closePopover={() => setQueryErrorMessage(undefined)}
      input={
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <QueryStringInput
              bubbleSubmitEvent={false}
              query={searchInput}
              indexPatterns={[dataView]}
              onChange={searchChangeHandler}
              onSubmit={searchSubmitHandler}
              placeholder={
                searchInput.language === SEARCH_QUERY_LANGUAGE.KUERY
                  ? i18n.translate('xpack.ml.stepDefineForm.queryPlaceholderKql', {
                      defaultMessage: 'Search for e.g. {example}',
                      values: { example: 'method : "GET" or status : "404"' },
                    })
                  : i18n.translate('xpack.ml.stepDefineForm.queryPlaceholderLucene', {
                      defaultMessage: 'Search for e.g. {example}',
                      values: { example: 'method:GET OR status:404' },
                    })
              }
              disableAutoFocus={true}
              dataTestSubj="mlDFAnalyticsQueryInput"
              languageSwitcherPopoverAnchorPosition="rightDown"
              appName={PLUGIN_ID}
            />
          </EuiFlexItem>
          {filters && filters.options && (
            <EuiFlexItem
              grow={false}
              data-test-subj="mlDFAnalyticsExplorationQueryBarFilterButtons"
            >
              <EuiButtonGroup
                legend={i18n.translate(
                  'xpack.ml.dataframe.analytics.explorationQueryBar.buttonGroupLegend',
                  {
                    defaultMessage: 'Analytics query bar filter buttons',
                  }
                )}
                options={filters.options}
                type="multi"
                idToSelectedMap={idToSelectedMap}
                onChange={(optionId: string) => {
                  const newIdToSelectedMap = { [optionId]: !idToSelectedMap[optionId] };
                  setIdToSelectedMap(newIdToSelectedMap);
                  debouncedHandleFilterUpdate(optionId, newIdToSelectedMap);
                }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      isOpen={queryErrorMessage?.query === searchInput.query && queryErrorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.ml.stepDefineForm.invalidQuery', {
          defaultMessage: 'Invalid Query',
        })}
        {': '}
        {queryErrorMessage?.message.split('\n')[0]}
      </EuiCode>
    </EuiInputPopover>
  );
};
