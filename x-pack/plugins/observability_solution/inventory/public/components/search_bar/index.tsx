/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { SearchBarOwnProps } from '@kbn/unified-search-plugin/public/search_bar';
import deepEqual from 'fast-deep-equal';
import React, { useCallback, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Query } from '@kbn/es-query';
import { EntityType } from '../../../common/entities';
import { useInventorySearchBarContext } from '../../context/inventory_search_bar_context_provider';
import { useAdHocInventoryDataView } from '../../hooks/use_adhoc_inventory_data_view';
import { useInventoryParams } from '../../hooks/use_inventory_params';
import { useKibana } from '../../hooks/use_kibana';
import { EntityTypesControls } from './entity_types_controls';
import { DiscoverButton } from './discover_button';
import { getKqlFieldsWithFallback } from '../../utils/get_kql_field_names_with_fallback';

export function SearchBar() {
  const { searchBarContentSubject$ } = useInventorySearchBarContext();
  const {
    services: {
      unifiedSearch,
      data: {
        query: { queryString: queryStringService },
      },
      telemetry,
    },
  } = useKibana();

  const {
    query: { kuery, entityTypes },
  } = useInventoryParams('/*');

  const { SearchBar: UnifiedSearchBar } = unifiedSearch.ui;

  const { dataView } = useAdHocInventoryDataView();

  const syncSearchBarWithUrl = useCallback(() => {
    const query = kuery ? { query: kuery, language: 'kuery' } : undefined;
    if (query && !deepEqual(queryStringService.getQuery(), query)) {
      queryStringService.setQuery(query);
    }

    if (!query) {
      queryStringService.clearQuery();
    }
  }, [kuery, queryStringService]);

  useEffect(() => {
    syncSearchBarWithUrl();
  }, [syncSearchBarWithUrl]);

  const registerSearchSubmittedEvent = useCallback(
    ({
      searchQuery,
      searchIsUpdate,
      searchEntityTypes,
    }: {
      searchQuery?: Query;
      searchEntityTypes?: string[];
      searchIsUpdate?: boolean;
    }) => {
      telemetry.reportEntityInventorySearchQuerySubmitted({
        kuery_fields: getKqlFieldsWithFallback(searchQuery?.query as string),
        entity_types: searchEntityTypes || [],
        action: searchIsUpdate ? 'submit' : 'refresh',
      });
    },
    [telemetry]
  );

  const registerEntityTypeFilteredEvent = useCallback(
    ({ filterEntityTypes, filterKuery }: { filterEntityTypes: string[]; filterKuery?: string }) => {
      telemetry.reportEntityInventoryEntityTypeFiltered({
        entity_types: filterEntityTypes,
        kuery_fields: filterKuery ? getKqlFieldsWithFallback(filterKuery) : [],
      });
    },
    [telemetry]
  );

  const handleEntityTypesChange = useCallback(
    (nextEntityTypes: EntityType[]) => {
      searchBarContentSubject$.next({ kuery, entityTypes: nextEntityTypes, refresh: false });
      registerEntityTypeFilteredEvent({ filterEntityTypes: nextEntityTypes, filterKuery: kuery });
    },
    [kuery, registerEntityTypeFilteredEvent, searchBarContentSubject$]
  );

  const handleQuerySubmit = useCallback<NonNullable<SearchBarOwnProps['onQuerySubmit']>>(
    ({ query }, isUpdate) => {
      searchBarContentSubject$.next({
        kuery: query?.query as string,
        entityTypes,
        refresh: !isUpdate,
      });

      registerSearchSubmittedEvent({
        searchQuery: query,
        searchEntityTypes: entityTypes,
        searchIsUpdate: isUpdate,
      });
    },
    [entityTypes, registerSearchSubmittedEvent, searchBarContentSubject$]
  );

  return (
    <EuiFlexGroup direction="row" gutterSize="s">
      <EuiFlexItem grow>
        <UnifiedSearchBar
          appName="Inventory"
          displayStyle="inPage"
          showDatePicker={false}
          showFilterBar={false}
          indexPatterns={dataView ? [dataView] : undefined}
          renderQueryInputAppend={() => <EntityTypesControls onChange={handleEntityTypesChange} />}
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
