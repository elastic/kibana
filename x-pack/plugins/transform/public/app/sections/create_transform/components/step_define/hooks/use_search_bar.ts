/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import { toElasticsearchQuery, fromKueryExpression, luceneStringToDsl } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import type { QueryErrorMessage } from '@kbn/ml-error-utils';

import { QUERY_LANGUAGE_KUERY, QUERY_LANGUAGE_LUCENE, QUERY_LANGUAGE } from '../common';

import { useWizardContext } from '../../wizard/wizard';
import {
  useCreateTransformWizardActions,
  useCreateTransformWizardSelector,
} from '../../../create_transform_store';

export const useSearchBar = () => {
  const { searchItems } = useWizardContext();
  const { dataView } = searchItems;

  const searchLanguage = useCreateTransformWizardSelector((s) => s.stepDefine.searchLanguage);
  const searchString = useCreateTransformWizardSelector((s) => s.stepDefine.searchString);
  const { setSearchLanguage, setSearchQuery, setSearchString } = useCreateTransformWizardActions();

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: searchString || '',
    language: searchLanguage,
  });

  const [queryErrorMessage, setQueryErrorMessage] = useState<QueryErrorMessage | undefined>(
    undefined
  );

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
      setQueryErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  return {
    actions: {
      searchChangeHandler,
      searchSubmitHandler,
      setQueryErrorMessage,
      setSearchInput,
    },
    state: {
      queryErrorMessage,
      searchInput,
    },
  };
};
