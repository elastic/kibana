/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Dispatch, FC, SetStateAction, useState } from 'react';

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

interface ExplorationQueryBarProps {
  indexPattern: IIndexPattern;
  setSearchQuery: Dispatch<SetStateAction<SavedSearchQuery>>;
}

export const ExplorationQueryBar: FC<ExplorationQueryBarProps> = ({
  indexPattern,
  setSearchQuery,
}) => {
  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>({
    query: '',
    language: SEARCH_QUERY_LANGUAGE.KUERY,
  });

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const searchSubmitHandler = (query: Query) => {
    switch (query.language) {
      case SEARCH_QUERY_LANGUAGE.KUERY:
        setSearchQuery(
          esKuery.toElasticsearchQuery(
            esKuery.fromKueryExpression(query.query as string),
            indexPattern
          )
        );
        return;
      case SEARCH_QUERY_LANGUAGE.LUCENE:
        setSearchQuery(esQuery.luceneStringToDsl(query.query as string));
        return;
    }
  };

  return (
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
  );
};
