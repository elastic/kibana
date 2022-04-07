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
import { ShardSizeFilter } from './shard_size_select';
import { DataVisualizerFieldNamesFilter } from './field_name_filter';
import { DataVisualizerFieldTypeFilter } from './field_type_filter';
import { TimeRange } from '../../../../../../../../src/plugins/data/common';
import { DataView, DataViewField } from '../../../../../../../../src/plugins/data_views/public';
import { JobFieldType } from '../../../../../common/types';
import { SearchQueryLanguage } from '../../types/combined_query';
import { useDataVisualizerKibana } from '../../../kibana_context';
import './_index.scss';
import { createMergedEsQuery } from '../../utils/saved_search_utils';
import { OverallStats } from '../../types/overall_stats';
interface Props {
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  samplerShardSize: number;
  setSamplerShardSize(s: number): void;
  overallStats: OverallStats;
  indexedFieldTypes: JobFieldType[];
  setVisibleFieldTypes(q: string[]): void;
  visibleFieldTypes: string[];
  setVisibleFieldNames(q: string[]): void;
  visibleFieldNames: string[];
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
  showEmptyFields: boolean;
  onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
}

export const SearchPanel: FC<Props> = ({
  dataView,
  searchString,
  searchQueryLanguage,
  samplerShardSize,
  setSamplerShardSize,
  overallStats,
  indexedFieldTypes,
  setVisibleFieldTypes,
  visibleFieldTypes,
  setVisibleFieldNames,
  visibleFieldNames,
  setSearchParams,
  showEmptyFields,
}) => {
  const {
    services: {
      uiSettings,
      notifications: { toasts },
      data: { query: queryManager },
      unifiedSearch: {
        ui: { SearchBar },
      },
    },
  } = useDataVisualizerKibana();
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
        title: i18n.translate('xpack.dataVisualizer.searchPanel.invalidSyntax', {
          defaultMessage: 'Invalid syntax',
        }),
      });
    }
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      data-test-subj="dataVisualizerSearchPanel"
      className={'dvSearchPanel__container'}
      responsive={false}
    >
      <EuiFlexItem grow={9} className={'dvSearchBar'}>
        <SearchBar
          dataTestSubj="dataVisualizerQueryInput"
          appName={'dataVisualizer'}
          showFilterBar={true}
          showDatePicker={false}
          showQueryInput={true}
          query={searchInput}
          onQuerySubmit={(params: { dateRange: TimeRange; query?: Query | undefined }) =>
            searchHandler({ query: params.query })
          }
          // @ts-expect-error onFiltersUpdated is a valid prop on SearchBar
          onFiltersUpdated={(filters: Filter[]) => searchHandler({ filters })}
          indexPatterns={[dataView]}
          placeholder={i18n.translate('xpack.dataVisualizer.searchPanel.queryBarPlaceholderText', {
            defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
          })}
          displayStyle={'inPage'}
          isClearable={true}
          customSubmitButton={<div />}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={2} className={'dvSearchPanel__controls'}>
        <ShardSizeFilter
          samplerShardSize={samplerShardSize}
          setSamplerShardSize={setSamplerShardSize}
        />

        <DataVisualizerFieldNamesFilter
          overallStats={overallStats}
          setVisibleFieldNames={setVisibleFieldNames}
          visibleFieldNames={visibleFieldNames}
          showEmptyFields={showEmptyFields}
        />
        <DataVisualizerFieldTypeFilter
          indexedFieldTypes={indexedFieldTypes}
          setVisibleFieldTypes={setVisibleFieldTypes}
          visibleFieldTypes={visibleFieldTypes}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
