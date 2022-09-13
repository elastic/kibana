/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Query, Filter } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { SearchQueryLanguage } from '../../application/utils/search_utils';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { createMergedEsQuery } from '../../application/utils/search_utils';
interface Props {
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  setSearchParams({
    searchQuery,
    searchString,
    queryLanguage,
    filters,
  }: {
    searchQuery: Query['query'];
    searchString: Query['query'];
    queryLanguage: SearchQueryLanguage;
    filters: Filter[];
  }): void;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

export const SearchPanel: FC<Props> = ({
  dataView,
  searchString,
  searchQueryLanguage,
  setSearchParams,
}) => {
  const {
    uiSettings,
    unifiedSearch: {
      ui: { SearchBar },
    },
    notifications: { toasts },
    data: { query: queryManager },
  } = useAiopsAppContext();

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: searchString || '',
    language: searchQueryLanguage,
  });

  useEffect(() => {
    setSearchInput({
      query: searchString || '',
      language: searchQueryLanguage,
    });
  }, [searchQueryLanguage, searchString, queryManager.filterManager]);

  const searchHandler = ({ query, filters }: { query?: Query; filters?: Filter[] }) => {
    const mergedQuery = query ?? searchInput;
    const mergedFilters = filters ?? queryManager.filterManager.getFilters();
    try {
      if (mergedFilters) {
        queryManager.filterManager.setFilters(mergedFilters);
      }

      const combinedQuery = createMergedEsQuery(
        mergedQuery,
        queryManager.filterManager.getFilters() ?? [],
        dataView,
        uiSettings
      );

      setSearchParams({
        searchQuery: combinedQuery,
        searchString: mergedQuery.query,
        queryLanguage: mergedQuery.language as SearchQueryLanguage,
        filters: mergedFilters,
      });
    } catch (e) {
      console.log('Invalid syntax', JSON.stringify(e, null, 2)); // eslint-disable-line no-console
      toasts.addError(e, {
        title: i18n.translate('xpack.aiops.searchPanel.invalidSyntax', {
          defaultMessage: 'Invalid syntax',
        }),
      });
    }
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      data-test-subj="aiopsSearchPanel"
      className={'aiopsSearchPanel__container'}
      responsive={false}
    >
      <EuiFlexItem grow={9} className={'aiopsSearchBar'}>
        <SearchBar
          dataTestSubj="aiopsQueryInput"
          appName={'aiops'}
          showFilterBar={true}
          showDatePicker={false}
          showQueryInput={true}
          query={searchInput}
          onQuerySubmit={(params: { dateRange: TimeRange; query?: Query | undefined }) =>
            searchHandler({ query: params.query })
          }
          indexPatterns={[dataView]}
          placeholder={i18n.translate('xpack.aiops.searchPanel.queryBarPlaceholderText', {
            defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
          })}
          displayStyle={'inPage'}
          isClearable={true}
          customSubmitButton={<div />}
          // @ts-expect-error onFiltersUpdated is a valid prop on SearchBar
          onFiltersUpdated={(filters: Filter[]) => searchHandler({ filters })}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
