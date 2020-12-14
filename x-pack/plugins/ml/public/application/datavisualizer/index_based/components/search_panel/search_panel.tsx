/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';

import {
  EuiCode,
  EuiFlexItem,
  EuiFlexGroup,
  EuiIconTip,
  EuiInputPopover,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
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

interface Props {
  indexPattern: IndexPattern;
  searchString: Query['query'];
  setSearchString(s: Query['query']): void;
  searchQuery: Query['query'];
  setSearchQuery(q: Query['query']): void;
  searchQueryLanguage: SearchQueryLanguage;
  setSearchQueryLanguage(q: any): void;
  samplerShardSize: number;
  setSamplerShardSize(s: number): void;
  totalCount: number;
}

const searchSizeOptions = [1000, 5000, 10000, 100000, -1].map((v) => {
  return {
    value: String(v),
    inputDisplay:
      v > 0 ? (
        <span data-test-subj={`mlDataVisualizerShardSizeOption ${v}`}>
          <FormattedMessage
            id="xpack.ml.datavisualizer.searchPanel.sampleSizeOptionLabel"
            defaultMessage="Sample size (per shard): {wrappedValue}"
            values={{ wrappedValue: <b>{v}</b> }}
          />
        </span>
      ) : (
        <span data-test-subj={`mlDataVisualizerShardSizeOption all`}>
          <FormattedMessage
            id="xpack.ml.datavisualizer.searchPanel.allOptionLabel"
            defaultMessage="Search all"
          />
        </span>
      ),
  };
});

export const SearchPanel: FC<Props> = ({
  indexPattern,
  searchString,
  setSearchString,
  searchQuery,
  setSearchQuery,
  searchQueryLanguage,
  setSearchQueryLanguage,
  samplerShardSize,
  setSamplerShardSize,
  totalCount,
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

      setSearchQuery(filterQuery);
      setSearchString(query.query);
      setSearchQueryLanguage(query.language);
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
              dataTestSubj="transformQueryInput"
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
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 270 }}>
            <EuiSuperSelect
              options={searchSizeOptions}
              valueOfSelected={String(samplerShardSize)}
              onChange={(value) => setSamplerShardSize(+value)}
              aria-label={i18n.translate(
                'xpack.ml.datavisualizer.searchPanel.sampleSizeAriaLabel',
                {
                  defaultMessage: 'Select number of documents to sample',
                }
              )}
              data-test-subj="mlDataVisualizerShardSizeSelect"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIconTip
              content={i18n.translate('xpack.ml.datavisualizer.searchPanel.queryBarPlaceholder', {
                defaultMessage:
                  'Selecting a smaller sample size will reduce query run times and the load on the cluster.',
              })}
              position="right"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.datavisualizer.searchPanel.totalDocCountLabel"
            defaultMessage="Total documents: {strongTotalCount}"
            values={{
              strongTotalCount: (
                <strong data-test-subj="mlDataVisualizerTotalDocCount">
                  <FormattedMessage
                    id="xpack.ml.datavisualizer.searchPanel.totalDocCountNumber"
                    defaultMessage="{totalCount, plural, one {#} other {#}}"
                    values={{ totalCount }}
                  />
                </strong>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false} />
    </EuiFlexGroup>
  );
};
