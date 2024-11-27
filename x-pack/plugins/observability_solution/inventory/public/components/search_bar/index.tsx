/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { SearchBarOwnProps } from '@kbn/unified-search-plugin/public/search_bar';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useUnifiedSearchContext } from '../../hooks/use_unified_search_context';
import { getKqlFieldsWithFallback } from '../../utils/get_kql_field_names_with_fallback';
import { ControlGroups } from './control_groups';

export function SearchBar() {
  const { refreshSubject$, dataView, searchState, onQueryChange } = useUnifiedSearchContext();

  const {
    services: {
      unifiedSearch,
      telemetry,
      data: {
        query: { queryString: queryStringService },
      },
    },
  } = useKibana();

  const { SearchBar: UnifiedSearchBar } = unifiedSearch.ui;

  const syncSearchBarWithUrl = useCallback(() => {
    const query = searchState.query;
    if (query && !deepEqual(queryStringService.getQuery(), query)) {
      queryStringService.setQuery(query);
    }

    if (!query) {
      queryStringService.clearQuery();
    }
  }, [searchState.query, queryStringService]);

  useEffect(() => {
    syncSearchBarWithUrl();
  }, [syncSearchBarWithUrl]);

  const registerSearchSubmittedEvent = useCallback(
    ({ searchQuery, searchIsUpdate }: { searchQuery?: Query; searchIsUpdate?: boolean }) => {
      telemetry.reportEntityInventorySearchQuerySubmitted({
        kuery_fields: getKqlFieldsWithFallback(searchQuery?.query as string),
        action: searchIsUpdate ? 'submit' : 'refresh',
      });
    },
    [telemetry]
  );

  const handleQuerySubmit = useCallback<NonNullable<SearchBarOwnProps['onQuerySubmit']>>(
    ({ query = { language: 'kuery', query: '' } }, isUpdate) => {
      if (isUpdate) {
        onQueryChange(query);
      } else {
        refreshSubject$.next();
      }

      registerSearchSubmittedEvent({
        searchQuery: query,
        searchIsUpdate: isUpdate,
      });
    },
    [registerSearchSubmittedEvent, onQueryChange, refreshSubject$]
  );

  return (
    <UnifiedSearchBar
      appName="Inventory"
      displayStyle="inPage"
      indexPatterns={dataView ? [dataView] : undefined}
      renderQueryInputAppend={() => <ControlGroups />}
      onQuerySubmit={handleQuerySubmit}
      placeholder={i18n.translate('xpack.inventory.searchBar.placeholder', {
        defaultMessage:
          'Search for your entities by name or its metadata (e.g. entity.type : service)',
      })}
      showDatePicker={false}
      showFilterBar
      showQueryInput
      showQueryMenu
    />
  );
}
