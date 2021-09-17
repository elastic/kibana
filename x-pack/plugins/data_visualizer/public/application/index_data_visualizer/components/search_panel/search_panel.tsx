/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Query, fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import { ShardSizeFilter } from './shard_size_select';
import { DataVisualizerFieldNamesFilter } from './field_name_filter';
import { DatavisualizerFieldTypeFilter } from './field_type_filter';
import { IndexPattern } from '../../../../../../../../src/plugins/data/common';
import { JobFieldType } from '../../../../../common/types';
import {
  ErrorMessage,
  SEARCH_QUERY_LANGUAGE,
  SearchQueryLanguage,
} from '../../types/combined_query';
import { useDataVisualizerKibana } from '../../../kibana_context';
import './_index.scss';
interface Props {
  indexPattern: IndexPattern;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  samplerShardSize: number;
  setSamplerShardSize(s: number): void;
  overallStats: any;
  indexedFieldTypes: JobFieldType[];
  setVisibleFieldTypes(q: string[]): void;
  visibleFieldTypes: string[];
  setVisibleFieldNames(q: string[]): void;
  visibleFieldNames: string[];
  setSearchParams({
    searchQuery,
    searchString,
    queryLanguage,
  }: {
    searchQuery: Query['query'];
    searchString: Query['query'];
    queryLanguage: SearchQueryLanguage;
  }): void;
  showEmptyFields: boolean;
}

export const SearchPanel: FC<Props> = ({
  indexPattern,
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
      notifications: { toasts },
      data: {
        ui: { SearchBar },
      },
    },
  } = useDataVisualizerKibana();

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: searchString || '',
    language: searchQueryLanguage,
  });
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  useEffect(() => {
    setSearchInput({
      query: searchString || '',
      language: searchQueryLanguage,
    });
  }, [searchQueryLanguage, searchString]);

  const searchHandler = (query?: Query) => {
    if (!query) return;
    let filterQuery;
    try {
      if (query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
        filterQuery = toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
      } else if (query.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
        filterQuery = luceneStringToDsl(query.query);
      } else {
        filterQuery = {};
      }
      setSearchParams({
        searchQuery: filterQuery,
        searchString: query.query,
        queryLanguage: query.language as SearchQueryLanguage,
      });
    } catch (e) {
      console.log('Invalid syntax', JSON.stringify(e, null, 2)); // eslint-disable-line no-console
      setErrorMessage({ query: query.query as string, message: e.message });
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
      className={'dvSearchPanel'}
    >
      <EuiFlexItem grow={9} className={'dvSearchBar'}>
        <SearchBar
          dataTestSubj="dataVisualizerQueryInput"
          appName={'dataVisualizer'}
          showFilterBar={true}
          showDatePicker={false}
          showQueryInput={true}
          query={searchInput}
          onQuerySubmit={(params) => searchHandler(params.query)}
          indexPatterns={[indexPattern]}
          placeholder={i18n.translate('xpack.dataVisualizer.searchPanel.queryBarPlaceholderText', {
            defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
          })}
          displayStyle={'inPage'}
          isClearable={true}
        />
      </EuiFlexItem>

      <EuiFlexItem grow={2} className={'dvSearchPanelControls'}>
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
        <DatavisualizerFieldTypeFilter
          indexedFieldTypes={indexedFieldTypes}
          setVisibleFieldTypes={setVisibleFieldTypes}
          visibleFieldTypes={visibleFieldTypes}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
