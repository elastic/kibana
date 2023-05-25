/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useReducer } from 'react';
import { EuiButtonGroup, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { SearchStrategy } from '../../../../common/data_streams';
import { SortOrder } from '../../../../common';
import {
  DATA_VIEW_POPOVER_CONTENT_WIDTH,
  INTEGRATION_PANEL_ID,
  sortOptions,
  sortOrdersLabel,
} from '../constants';
import { PanelId, SearchControlsParams, SearchHandler } from '../types';
import { getSearchStrategy } from '../utils';

type SearchControlsHandler = (params: SearchControlsParams) => void;

const defaultSearch: SearchControlsParams = {
  name: '',
  sortOrder: 'asc',
};

const initialCache = {
  [INTEGRATION_PANEL_ID]: defaultSearch,
};

const searchCacheReducer = (
  cache: Record<string, SearchControlsParams>,
  update: { id: PanelId; params: SearchControlsParams }
) => {
  const { id, params } = update;

  return {
    ...cache,
    [id]: params,
  };
};

interface UseSearchStrategyOptions {
  id: PanelId;
  onSearch: SearchHandler;
}

export const useSearchStrategy = ({ id, onSearch }: UseSearchStrategyOptions) => {
  const [searchCache, insertSearch] = useReducer(searchCacheReducer, initialCache);

  const search = searchCache[id] ?? defaultSearch;

  const handleSearch = useCallback(
    (params: SearchControlsParams) => {
      const strategy = getSearchStrategy(id);

      insertSearch({ id, params });

      return onSearch({
        ...params,
        strategy,
        ...(strategy === SearchStrategy.INTEGRATIONS_DATA_STREAMS && { integrationId: id }),
      });
    },
    [id, onSearch]
  );

  // Restore the search result when navigating into an existing search
  // This should be cached so it'll be transparent to the user
  useEffect(() => {
    if (searchCache[id]) {
      handleSearch(searchCache[id]);
    }
  }, [id]);

  return [search, handleSearch] as [SearchControlsParams, SearchControlsHandler];
};

/**
 * SearchControls component definition, it works with the useSearchStrategy custom hook
 */
interface SearchControlsProps {
  isLoading: boolean;
  onSearch: SearchControlsHandler;
  search: SearchControlsParams;
}

export const SearchControls = ({ search, onSearch, isLoading }: SearchControlsProps) => {
  const handleQueryChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const newSearch = { ...search, name: event.target.value };
    onSearch(newSearch);
  };

  const handleSortChange = (id: string) => {
    const newSearch = { ...search, sortOrder: id as SearchControlsParams['sortOrder'] };
    onSearch(newSearch);
  };

  return (
    <EuiPanel paddingSize="s" hasShadow={false} css={{ width: DATA_VIEW_POPOVER_CONTENT_WIDTH }}>
      <EuiFlexGroup gutterSize="xs" responsive={false}>
        <EuiFlexItem>
          <EuiFieldSearch
            compressed
            incremental
            value={search.name}
            onChange={handleQueryChange}
            isLoading={isLoading}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            isIconOnly
            buttonSize="compressed"
            options={sortOptions}
            legend={sortOrdersLabel}
            idSelected={search.sortOrder as SortOrder}
            onChange={handleSortChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
