/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { SearchBarOwnProps } from '@kbn/unified-search-plugin/public/search_bar';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect } from 'react';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useKibana } from '../../hooks/use_kibana';
import { useUnifiedSearch } from '../../hooks/use_unified_search';
import { getKqlFieldsWithFallback } from '../../utils/get_kql_field_names_with_fallback';
import { ControlGroups } from './control_groups';
import { DiscoverButton } from './discover_button';

export function SearchBar() {
  const { refreshSubject$, dataView } = useInventorySearchBarContext();
  const { searchState, setSearchState } = useUnifiedSearch();

  const {
    services: {
      unifiedSearch,
      data: {
        query: { queryString: queryStringService },
      },
      telemetry,
    },
  } = useKibana();

  const { SearchBar: UnifiedSearchBar } = unifiedSearch.ui;

  const syncSearchBarWithUrl = useCallback(() => {
    const { query } = searchState;
    if (query && !deepEqual(queryStringService.getQuery(), query)) {
      queryStringService.setQuery(query);
    }

    if (!query || query.query === '') {
      queryStringService.clearQuery();
    }
  }, [queryStringService, searchState]);

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
      if (!isUpdate) {
        refreshSubject$.next();
      } else {
        setSearchState((state) => ({ ...state, query }));

        registerSearchSubmittedEvent({
          searchQuery: query,
          searchIsUpdate: isUpdate,
        });
      }
    },
    [setSearchState, registerSearchSubmittedEvent, refreshSubject$]
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow>
        <UnifiedSearchBar
          appName="Inventory"
          displayStyle="inPage"
          showDatePicker={false}
          indexPatterns={dataView ? [dataView] : undefined}
          renderQueryInputAppend={ControlGroups}
          onQuerySubmit={handleQuerySubmit}
          placeholder={i18n.translate('xpack.inventory.searchBar.placeholder', {
            defaultMessage:
              'Search for your entities by name or its metadata (e.g. entity.type : service)',
          })}
        />
      </EuiFlexItem>

      {dataView ? (
        <EuiFlexItem grow={false}>
          <DiscoverButton dataView={dataView} />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
}
