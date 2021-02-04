/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';

import { EuiCode, EuiFlexItem, EuiFlexGroup, EuiInputPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IndexPattern } from '../../../../../../../../../src/plugins/data/public';

import {
  SEARCH_QUERY_LANGUAGE,
  ErrorMessage,
  SearchQueryLanguage,
} from '../../../../../../common/constants/search';

import {
  esKuery,
  esQuery,
  Query,
  QueryStringInput,
} from '../../../../../../../../../src/plugins/data/public';
import { ShardSizeFilter } from './shard_size_select';
import { DataVisualizerFieldNamesFilter } from './field_name_filter';
import { DatavisualizerFieldTypeFilter } from './field_type_filter';
import { MlJobFieldType } from '../../../../../../common/types/field_types';

interface Props {
  indexPattern: IndexPattern;
  searchString: Query['query'];
  searchQuery: Query['query'];
  searchQueryLanguage: SearchQueryLanguage;
  samplerShardSize: number;
  setSamplerShardSize(s: number): void;
  overallStats: any;
  indexedFieldTypes: MlJobFieldType[];
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
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: searchString || '',
    language: searchQueryLanguage,
  });
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  const searchHandler = (query: Query) => {
    let filterQuery;
    try {
      if (query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
        filterQuery = esKuery.toElasticsearchQuery(
          esKuery.fromKueryExpression(query.query),
          indexPattern
        );
      } else if (query.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
        filterQuery = esQuery.luceneStringToDsl(query.query);
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
    }
  };
  const searchChangeHandler = (query: Query) => setSearchInput(query);

  return (
    <EuiFlexGroup gutterSize="m" alignItems="center" data-test-subj="mlDataVisualizerSearchPanel">
      <EuiFlexItem>
        <EuiInputPopover
          style={{ maxWidth: '100%' }}
          closePopover={() => setErrorMessage(undefined)}
          input={
            <QueryStringInput
              bubbleSubmitEvent={true}
              query={searchInput}
              indexPatterns={[indexPattern]}
              onChange={searchChangeHandler}
              onSubmit={searchHandler}
              placeholder={i18n.translate(
                'xpack.ml.datavisualizer.searchPanel.queryBarPlaceholderText',
                {
                  defaultMessage: 'Search… (e.g. status:200 AND extension:"PHP")',
                }
              )}
              disableAutoFocus={true}
              dataTestSubj="mlDataVisualizerQueryInput"
              languageSwitcherPopoverAnchorPosition="rightDown"
            />
          }
          isOpen={errorMessage?.query === searchInput.query && errorMessage?.message !== ''}
        >
          <EuiCode>
            {i18n.translate(
              'xpack.ml.datavisualizer.searchPanel.invalidKuerySyntaxErrorMessageQueryBar',
              {
                defaultMessage: 'Invalid query',
              }
            )}
            {': '}
            {errorMessage?.message.split('\n')[0]}
          </EuiCode>
        </EuiInputPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ShardSizeFilter
          samplerShardSize={samplerShardSize}
          setSamplerShardSize={setSamplerShardSize}
        />
      </EuiFlexItem>
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
    </EuiFlexGroup>
  );
};
