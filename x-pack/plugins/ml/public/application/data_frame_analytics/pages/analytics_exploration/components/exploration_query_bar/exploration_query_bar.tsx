/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';

import { EuiCode, EuiInputPopover } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { IIndexPattern } from '../../../../../../../../../../src/plugins/data/common/index_patterns';
import {
  esKuery,
  esQuery,
  Query,
  QueryStringInput,
} from '../../../../../../../../../../src/plugins/data/public';

import { SEARCH_QUERY_LANGUAGE } from '../../../../../../../common/constants/search';

import { SavedSearchQuery } from '../../../../../contexts/ml';

interface ErrorMessage {
  query: string;
  message: string;
}

interface ExplorationQueryBarProps {
  indexPattern: IIndexPattern;
  setSearchQuery: Dispatch<SetStateAction<SavedSearchQuery>>;
  includeQueryString?: boolean;
  defaultQueryString?: string;
}

export const ExplorationQueryBar: FC<ExplorationQueryBarProps> = ({
  indexPattern,
  setSearchQuery,
  includeQueryString = false,
  defaultQueryString,
}) => {
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: '',
    language: SEARCH_QUERY_LANGUAGE.KUERY,
  });

  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  useEffect(() => {
    if (defaultQueryString !== undefined) {
      setSearchInput({ query: defaultQueryString, language: SEARCH_QUERY_LANGUAGE.KUERY });
    }
  }, []);

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const searchSubmitHandler = (query: Query) => {
    try {
      switch (query.language) {
        case SEARCH_QUERY_LANGUAGE.KUERY:
          const convertedKQuery = esKuery.toElasticsearchQuery(
            esKuery.fromKueryExpression(query.query as string),
            indexPattern
          );
          setSearchQuery(
            includeQueryString
              ? { queryString: query.query, query: convertedKQuery }
              : convertedKQuery
          );
          return;
        case SEARCH_QUERY_LANGUAGE.LUCENE:
          const convertedLQuery = esQuery.luceneStringToDsl(query.query as string);
          setSearchQuery(
            includeQueryString
              ? { queryString: query.query, query: convertedLQuery }
              : convertedLQuery
          );
          return;
      }
    } catch (e) {
      setErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  return (
    <EuiInputPopover
      style={{ maxWidth: '100%' }}
      closePopover={() => setErrorMessage(undefined)}
      input={
        <QueryStringInput
          bubbleSubmitEvent={true}
          query={searchInput}
          indexPatterns={[indexPattern]}
          onChange={searchChangeHandler}
          onSubmit={searchSubmitHandler}
          placeholder={
            searchInput.language === SEARCH_QUERY_LANGUAGE.KUERY
              ? i18n.translate('xpack.ml.stepDefineForm.queryPlaceholderKql', {
                  defaultMessage: 'e.g. {example}',
                  values: { example: 'method : "GET" or status : "404"' },
                })
              : i18n.translate('xpack.ml.stepDefineForm.queryPlaceholderLucene', {
                  defaultMessage: 'e.g. {example}',
                  values: { example: 'method:GET OR status:404' },
                })
          }
          disableAutoFocus={true}
          dataTestSubj="transformQueryInput"
          languageSwitcherPopoverAnchorPosition="rightDown"
        />
      }
      isOpen={errorMessage?.query === searchInput.query && errorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.ml.stepDefineForm.invalidQuery', {
          defaultMessage: 'Invalid Query',
        })}
        {': '}
        {errorMessage?.message.split('\n')[0]}
      </EuiCode>
    </EuiInputPopover>
  );
};
