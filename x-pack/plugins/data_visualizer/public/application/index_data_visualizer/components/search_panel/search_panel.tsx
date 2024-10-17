/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { css } from '@emotion/react';
import {
  useEuiBreakpoint,
  useIsWithinMaxBreakpoint,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
} from '@elastic/eui';
import type { Query, Filter } from '@kbn/es-query';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { SearchPanelContent } from './search_bar';
import { DataVisualizerFieldNamesFilter } from './field_name_filter';
import { DataVisualizerFieldTypeFilter } from './field_type_filter';
import type { OverallStats } from '../../types/overall_stats';

interface Props {
  dataView: DataView;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  overallStats: OverallStats;
  indexedFieldTypes: string[];
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
  onQueryChange?: (query: Query['query'] | undefined) => void;
}

export const SearchPanel: FC<Props> = ({
  dataView,
  searchString,
  searchQuery,
  searchQueryLanguage,
  overallStats,
  indexedFieldTypes,
  setVisibleFieldTypes,
  visibleFieldTypes,
  setVisibleFieldNames,
  visibleFieldNames,
  setSearchParams,
  showEmptyFields,
  onQueryChange,
}) => {
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
        <SearchPanelContent
          dataView={dataView}
          setSearchParams={setSearchParams}
          searchString={searchString}
          searchQuery={searchQuery}
          searchQueryLanguage={searchQueryLanguage}
          onQueryChange={onQueryChange}
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
