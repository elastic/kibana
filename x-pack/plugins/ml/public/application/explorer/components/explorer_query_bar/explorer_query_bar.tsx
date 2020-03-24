/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useEffect } from 'react';
// import { i18n } from '@kbn/i18n';
import {
  Query,
  esKuery,
  esQuery,
  QueryStringInput,
} from '../../../../../../../../src/plugins/data/public';
import { IIndexPattern } from '../../../../../../../../src/plugins/data/common/index_patterns';
// @ts-ignore cannot find module
import { QUERY_LANGUAGE_KUERY, QUERY_LANGUAGE_LUCENE } from '../../explorer_constants';
import { explorerService } from '../../explorer_dashboard_service';

export function getKqlQueryValues({ inputString, queryLanguage, indexPattern }: any) {
  let influencersFilterQuery;
  const ast = esKuery.fromKueryExpression(inputString);
  const isAndOperator = ast.function === 'and';
  const filteredFields: any = [];
  // if ast.type == 'function' then layout of ast.arguments:
  // [{ arguments: [ { type: 'literal', value: 'AAL' } ] },{ arguments: [ { type: 'literal', value: 'AAL' } ] }]
  if (ast && Array.isArray(ast.arguments)) {
    ast.arguments.forEach(arg => {
      if (arg.arguments !== undefined) {
        arg.arguments.forEach((nestedArg: any) => {
          if (typeof nestedArg.value === 'string') {
            filteredFields.push(nestedArg.value);
          }
        });
      } else if (typeof arg.value === 'string') {
        filteredFields.push(arg.value);
      }
    });
  }
  if (queryLanguage === QUERY_LANGUAGE_KUERY) {
    influencersFilterQuery = esKuery.toElasticsearchQuery(
      esKuery.fromKueryExpression(inputString),
      indexPattern
    );
  } else if (queryLanguage === QUERY_LANGUAGE_LUCENE) {
    influencersFilterQuery = esQuery.luceneStringToDsl(inputString);
  }

  const clearSettings =
    // @ts-ignore // TODO: fix type
    influencersFilterQuery?.match_all && Object.keys(influencersFilterQuery.match_all).length === 0;

  return {
    clearSettings,
    settings: {
      filterQuery: influencersFilterQuery,
      queryString: inputString,
      tableQueryString: inputString,
      isAndOperator,
      filteredFields,
    },
  };
}

function getInitSearchInputState({
  filterActive,
  queryString,
}: {
  filterActive: boolean;
  queryString?: string;
}) {
  if (queryString !== undefined && filterActive === true) {
    return {
      language: QUERY_LANGUAGE_KUERY,
      query: queryString,
    };
  } else {
    return {
      query: '',
      language: QUERY_LANGUAGE_KUERY,
    };
  }
}

interface ExplorerQueryBarProps {
  filterActive: boolean;
  filterIconTriggeredQuery: string;
  filterPlaceHolder: string;
  indexPattern: IIndexPattern;
  queryString?: string;
}

export const ExplorerQueryBar: FC<ExplorerQueryBarProps> = ({
  filterActive,
  filterIconTriggeredQuery,
  filterPlaceHolder,
  indexPattern,
  queryString,
}) => {
  // The internal state of the input query bar updated on every key stroke.
  // TODO: update searchInput type
  const [searchInput, setSearchInput] = useState<any>(
    getInitSearchInputState({ filterActive, queryString })
  );

  useEffect(() => {
    setSearchInput({
      language: QUERY_LANGUAGE_KUERY,
      query: filterIconTriggeredQuery,
    });
  }, [filterIconTriggeredQuery]);

  const searchChangeHandler = (query: Query) => setSearchInput(query);
  const applyInfluencersFilterQuery = (query: any) => {
    const { clearSettings, settings } = getKqlQueryValues({
      inputString: query.query,
      queryLanguage: query.language,
      indexPattern,
    });

    if (clearSettings === true) {
      explorerService.clearInfluencerFilterSettings();
    } else {
      explorerService.setInfluencerFilterSettings(settings);
    }
  };

  return (
    <QueryStringInput
      bubbleSubmitEvent
      query={searchInput}
      indexPatterns={[indexPattern]}
      onChange={searchChangeHandler}
      onSubmit={applyInfluencersFilterQuery}
      placeholder={filterPlaceHolder}
      disableAutoFocus
      dataTestSubj="explorerQueryInput"
      languageSwitcherPopoverAnchorPosition="rightDown"
    />
  );
};
