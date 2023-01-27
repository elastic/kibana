/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  useEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Query, Filter } from '@kbn/es-query';
import type { TimeRange } from '@kbn/es-query';
import { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import { isDefined } from '@kbn/ml-is-defined';
import { DataVisualizerFieldNamesFilter } from './field_name_filter';
import { DataVisualizerFieldTypeFilter } from './field_type_filter';
import { SupportedFieldType } from '../../../../../common/types';
import { SearchQueryLanguage } from '../../types/combined_query';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { createMergedEsQuery } from '../../utils/saved_search_utils';
import { OverallStats } from '../../types/overall_stats';

interface Props {
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  overallStats: OverallStats;
  indexedFieldTypes: SupportedFieldType[];
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
    const mergedQuery = isDefined(query) ? query : searchInput;
    const mergedFilters = isDefined(filters) ? filters : queryManager.filterManager.getFilters();
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

  const dvSearchPanelControls = css({
    marginLeft: '0px !important',
    paddingLeft: '0px !important',
    paddingRight: '0px !important',
    flexDirection: 'row',
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      padding: 0,
    },
  });

  const dvSearchPanelContainer = css({
    alignItems: 'baseline',
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      flexDirection: 'column',
    },
  });

  const dvSearchBar = css({
    [useEuiBreakpoint(['xs', 's', 'm', 'l'])]: {
      minWidth: `max(100%, 300px)`,
    },
  });

  const isWithinXl = useIsWithinMaxBreakpoint('xl');

  return (
    <EuiFlexGroup
      gutterSize="none"
      data-test-subj="dataVisualizerSearchPanel"
      css={dvSearchPanelContainer}
      responsive={false}
    >
      <EuiFlexItem grow={9} css={dvSearchBar}>
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

      {isWithinXl ? <EuiSpacer size="s" /> : null}
      <EuiFlexItem grow={2} css={dvSearchPanelControls}>
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
