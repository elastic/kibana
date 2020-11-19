/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';

import { EuiButtonGroup, EuiCode, EuiFlexGroup, EuiFlexItem, EuiInputPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { Dictionary } from '../../../../../../../common/types/common';
import { IIndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns';
import {
  esKuery,
  esQuery,
  Query,
  QueryStringInput,
} from '../../../../../../../../../../src/plugins/data/public';

import { SEARCH_QUERY_LANGUAGE } from '../../../../../../../common/constants/search';

import { SavedSearchQuery } from '../../../../../contexts/ml';
import { removeFilterFromQueryString } from '../../../../../explorer/explorer_utils';

interface ErrorMessage {
  query: string;
  message: string;
}

interface ExplorationQueryBarProps {
  indexPattern: IIndexPattern;
  setSearchQuery: Dispatch<SetStateAction<SavedSearchQuery>>;
  includeQueryString?: boolean;
  defaultQueryString?: string;
  filters?: {
    options: Array<{ id: string; label: string }>;
    columnId: string;
    key: Dictionary<boolean>;
  };
}

export const ExplorationQueryBar: FC<ExplorationQueryBarProps> = ({
  indexPattern,
  setSearchQuery,
  includeQueryString = false,
  defaultQueryString,
  filters,
}) => {
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: '',
    language: SEARCH_QUERY_LANGUAGE.KUERY,
  });
  const [idToSelectedMap, setIdToSelectedMap] = useState<{ [id: string]: boolean }>({});

  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  useEffect(() => {
    if (defaultQueryString !== undefined) {
      setSearchInput({ query: defaultQueryString, language: SEARCH_QUERY_LANGUAGE.KUERY });
    }
  }, [defaultQueryString !== undefined]);

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const searchSubmitHandler = (query: Query, filtering?: boolean) => {
    // If moved to querying manually, clear filter selection.
    if (filtering === undefined) {
      setIdToSelectedMap({});
    }

    try {
      switch (query.language) {
        case SEARCH_QUERY_LANGUAGE.KUERY:
          const convertedKQuery = esKuery.toElasticsearchQuery(
            esKuery.fromKueryExpression(query.query as string),
            indexPattern
          );
          setSearchQuery(
            includeQueryString
              ? { queryString: query.query, query: convertedKQuery }
              : convertedKQuery
          );
          return;
        case SEARCH_QUERY_LANGUAGE.LUCENE:
          const convertedLQuery = esQuery.luceneStringToDsl(query.query as string);
          setSearchQuery(
            includeQueryString
              ? { queryString: query.query, query: convertedLQuery }
              : convertedLQuery
          );
          return;
      }
    } catch (e) {
      setErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  const handleFilterUpdate = (optionId: string, currentIdToSelectedMap: any) => {
    let newQuery = '';
    const filterValue = filters?.key[optionId];
    const filterQueryString = `${filters?.columnId}:${filterValue}`;
    const regex = new RegExp(`${filters?.columnId}\s?:\s?(true|false)`, 'g');

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
  };

  return (
    <EuiInputPopover
      style={{ maxWidth: '100%' }}
      closePopover={() => setErrorMessage(undefined)}
      input={
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <QueryStringInput
              bubbleSubmitEvent={true}
              query={searchInput}
              indexPatterns={[indexPattern]}
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
              dataTestSubj="transformQueryInput"
              languageSwitcherPopoverAnchorPosition="rightDown"
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
                  handleFilterUpdate(optionId, newIdToSelectedMap);
                }}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      isOpen={errorMessage?.query === searchInput.query && errorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.ml.stepDefineForm.invalidQuery', {
          defaultMessage: 'Invalid Query',
        })}
        {': '}
        {errorMessage?.message.split('\n')[0]}
      </EuiCode>
    </EuiInputPopover>
  );
};
