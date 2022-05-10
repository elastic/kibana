/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import { toElasticsearchQuery, fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';
import { Query } from '@kbn/data-plugin/public';

import { getPivotQuery } from '../../../../../common';

import {
  ErrorMessage,
  StepDefineExposedState,
  QUERY_LANGUAGE_KUERY,
  QUERY_LANGUAGE_LUCENE,
  QUERY_LANGUAGE,
} from '../common';

import { StepDefineFormProps } from '../step_define_form';

export const useSearchBar = (
  defaults: StepDefineExposedState,
  dataView: StepDefineFormProps['searchItems']['dataView']
) => {
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: defaults.searchString || '',
    language: defaults.searchLanguage,
  });

  // The state of the input query bar updated on every submit and to be exposed.
  const [searchLanguage, setSearchLanguage] = useState<StepDefineExposedState['searchLanguage']>(
    defaults.searchLanguage
  );

  const [searchString, setSearchString] = useState<StepDefineExposedState['searchString']>(
    defaults.searchString
  );

  const [searchQuery, setSearchQuery] = useState(defaults.searchQuery);

  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const searchSubmitHandler = (query: Query) => {
    setSearchLanguage(query.language as QUERY_LANGUAGE);
    setSearchString(query.query !== '' ? (query.query as string) : undefined);
    try {
      switch (query.language) {
        case QUERY_LANGUAGE_KUERY:
          setSearchQuery(
            toElasticsearchQuery(fromKueryExpression(query.query as string), dataView)
          );
          return;
        case QUERY_LANGUAGE_LUCENE:
          setSearchQuery(luceneStringToDsl(query.query as string));
          return;
      }
    } catch (e) {
      setErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  const pivotQuery = getPivotQuery(searchQuery);

  return {
    actions: {
      searchChangeHandler,
      searchSubmitHandler,
      setErrorMessage,
      setSearchInput,
      setSearchLanguage,
      setSearchQuery,
      setSearchString,
    },
    state: {
      errorMessage,
      pivotQuery,
      searchInput,
      searchLanguage,
      searchQuery,
      searchString,
    },
  };
};
