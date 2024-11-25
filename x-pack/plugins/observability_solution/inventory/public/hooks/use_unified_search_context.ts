/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { buildEsQuery, type Filter, fromKueryExpression, type Query } from '@kbn/es-query';
import createContainer from 'constate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { map, Subject, Subscription, tap } from 'rxjs';
import { generateFilters } from '@kbn/data-plugin/public';
import useEffectOnce from 'react-use/lib/useEffectOnce';
import deepEqual from 'fast-deep-equal';
import { i18n } from '@kbn/i18n';
import { useKibanaQuerySettings } from '@kbn/observability-shared-plugin/public';
import { useAdHocInventoryDataView } from './use_adhoc_inventory_data_view';
import { useUnifiedSearchUrl } from './use_unified_search_url';
import { useKibana } from './use_kibana';

function useUnifiedSearch() {
  const [isControlPanelsInitiated, setIsControlPanelsInitiated] = useState(false);
  const { dataView } = useAdHocInventoryDataView();
  const [refreshSubject$] = useState<Subject<void>>(new Subject());
  const { searchState, setSearchState } = useUnifiedSearchUrl();
  const kibanaQuerySettings = useKibanaQuerySettings();
  const {
    services: {
      data: {
        query: { filterManager: filterManagerService, queryString: queryStringService },
      },
      notifications,
    },
  } = useKibana();

  useEffectOnce(() => {
    if (!deepEqual(filterManagerService.getFilters(), searchState.filters)) {
      filterManagerService.setFilters(
        searchState.filters.map((item) => ({
          ...item,
          meta: { ...item.meta, index: dataView?.id },
        }))
      );
    }

    if (!deepEqual(queryStringService.getQuery(), searchState.query)) {
      queryStringService.setQuery(searchState.query);
    }
  });

  useEffect(() => {
    const subscription = new Subscription();
    subscription.add(
      filterManagerService
        .getUpdates$()
        .pipe(
          map(() => filterManagerService.getFilters()),
          tap((filters) => setSearchState({ type: 'SET_FILTERS', filters }))
        )
        .subscribe()
    );

    subscription.add(
      queryStringService
        .getUpdates$()
        .pipe(
          map(() => queryStringService.getQuery() as Query),
          tap((query) => setSearchState({ type: 'SET_QUERY', query }))
        )
        .subscribe()
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [filterManagerService, queryStringService, setSearchState]);

  const validateQuery = useCallback(
    (query: Query) => {
      fromKueryExpression(query.query, kibanaQuerySettings);
    },
    [kibanaQuerySettings]
  );

  const onQueryChange = useCallback(
    (query: Query) => {
      try {
        validateQuery(query);
        setSearchState({ type: 'SET_QUERY', query });
      } catch (e) {
        const err = e as Error;
        notifications.toasts.addDanger({
          title: i18n.translate('xpack.inventory.unifiedSearchContext.queryError', {
            defaultMessage: 'Error while updating the new query',
          }),
          text: err.message,
        });
      }
    },
    [validateQuery, setSearchState, notifications.toasts]
  );

  const onPanelFiltersChange = useCallback(
    (panelFilters: Filter[]) => {
      setSearchState({ type: 'SET_PANEL_FILTERS', panelFilters });
    },
    [setSearchState]
  );

  const onFiltersChange = useCallback(
    (filters: Filter[]) => {
      setSearchState({ type: 'SET_FILTERS', filters });
    },
    [setSearchState]
  );

  const addFilter = useCallback(
    ({
      fieldName,
      operation,
      value,
    }: {
      fieldName: string;
      value: string;
      operation: '+' | '-';
    }) => {
      if (dataView) {
        const newFilters = generateFilters(
          filterManagerService,
          fieldName,
          value,
          operation,
          dataView
        );
        setSearchState({ type: 'SET_FILTERS', filters: [...newFilters, ...searchState.filters] });
      }
    },
    [dataView, filterManagerService, searchState.filters, setSearchState]
  );

  const stringifiedEsQuery = useMemo(() => {
    if (dataView) {
      return JSON.stringify(
        buildEsQuery(dataView, searchState.query, [
          ...searchState.panelFilters,
          ...searchState.filters,
        ])
      );
    }
  }, [dataView, searchState.panelFilters, searchState.filters, searchState.query]);

  return {
    isControlPanelsInitiated,
    setIsControlPanelsInitiated,
    dataView,
    refreshSubject$,
    searchState,
    addFilter,
    stringifiedEsQuery,
    onQueryChange,
    onPanelFiltersChange,
    onFiltersChange,
  };
}

const UnifiedSearch = createContainer(useUnifiedSearch);
export const [UnifiedSearchProvider, useUnifiedSearchContext] = UnifiedSearch;
