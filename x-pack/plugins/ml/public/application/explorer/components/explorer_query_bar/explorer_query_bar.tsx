/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState, useEffect } from 'react';
import { EuiCode, EuiInputPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import { Query } from '../../../../../../../../src/plugins/data/public';
import { QueryStringInput } from '../../../../../../../../src/plugins/unified_search/public';
import type { DataView } from '../../../../../../../../src/plugins/data_views/common';
import { SEARCH_QUERY_LANGUAGE, ErrorMessage } from '../../../../../common/constants/search';
import { InfluencersFilterQuery } from '../../../../../common/types/es_client';
import { useAnomalyExplorerContext } from '../../anomaly_explorer_context';

export const DEFAULT_QUERY_LANG = SEARCH_QUERY_LANGUAGE.KUERY;

export interface KQLFilterSettings {
  filterQuery: InfluencersFilterQuery;
  queryString: string;
  tableQueryString: string;
  isAndOperator: boolean;
  filteredFields: string[];
}

export function getKqlQueryValues({
  inputString,
  queryLanguage,
  indexPattern,
}: {
  inputString: string | { [key: string]: unknown };
  queryLanguage: string;
  indexPattern: DataView;
}): { clearSettings: boolean; settings: KQLFilterSettings } {
  let influencersFilterQuery: InfluencersFilterQuery = {};
  const filteredFields: string[] = [];
  const ast = fromKueryExpression(inputString);
  const isAndOperator = ast && ast.function === 'and';
  // if ast.type == 'function' then layout of ast.arguments:
  // [{ arguments: [ { type: 'literal', value: 'AAL' } ] },{ arguments: [ { type: 'literal', value: 'AAL' } ] }]
  if (ast && Array.isArray(ast.arguments)) {
    ast.arguments.forEach((arg) => {
      if (arg.arguments !== undefined) {
        arg.arguments.forEach((nestedArg: { type: string; value: string }) => {
          if (typeof nestedArg.value === 'string') {
            filteredFields.push(nestedArg.value);
          }
        });
      } else if (typeof arg.value === 'string') {
        filteredFields.push(arg.value);
      }
    });
  }
  if (queryLanguage === SEARCH_QUERY_LANGUAGE.KUERY) {
    influencersFilterQuery = toElasticsearchQuery(fromKueryExpression(inputString), indexPattern);
  } else if (queryLanguage === SEARCH_QUERY_LANGUAGE.LUCENE) {
    influencersFilterQuery = luceneStringToDsl(inputString);
  }

  const clearSettings = Boolean(
    influencersFilterQuery?.match_all && Object.keys(influencersFilterQuery.match_all).length === 0
  );
  return {
    clearSettings,
    settings: {
      filterQuery: influencersFilterQuery,
      queryString: inputString as string,
      tableQueryString: inputString as string,
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
      language: SEARCH_QUERY_LANGUAGE.KUERY,
      query: queryString,
    };
  } else {
    return {
      query: '',
      language: DEFAULT_QUERY_LANG,
    };
  }
}

interface ExplorerQueryBarProps {
  filterActive: boolean;
  filterPlaceHolder?: string;
  indexPattern: DataView;
  queryString?: string;
  updateLanguage: (language: string) => void;
}

export const ExplorerQueryBar: FC<ExplorerQueryBarProps> = ({
  filterActive,
  filterPlaceHolder,
  indexPattern,
  queryString,
  updateLanguage,
}) => {
  const { anomalyExplorerCommonStateService } = useAnomalyExplorerContext();

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>(
    getInitSearchInputState({ filterActive, queryString })
  );
  const [errorMessage, setErrorMessage] = useState<ErrorMessage | undefined>(undefined);

  useEffect(
    function updateSearchInputFromFilter() {
      setSearchInput(getInitSearchInputState({ filterActive, queryString }));
    },
    [filterActive, queryString]
  );

  const searchChangeHandler = (query: Query) => {
    if (searchInput.language !== query.language) {
      updateLanguage(query.language);
    }
    setSearchInput(query);
  };

  const applyInfluencersFilterQuery = (query: Query) => {
    try {
      const { clearSettings, settings } = getKqlQueryValues({
        inputString: query.query,
        queryLanguage: query.language,
        indexPattern,
      });

      if (clearSettings === true) {
        anomalyExplorerCommonStateService.clearFilterSettings();
      } else {
        anomalyExplorerCommonStateService.setFilterSettings(settings);
      }
    } catch (e) {
      console.log('Invalid query syntax in search bar', e); // eslint-disable-line no-console
      setErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  return (
    <EuiInputPopover
      style={{ maxWidth: '100%' }}
      closePopover={() => setErrorMessage(undefined)}
      input={
        <QueryStringInput
          bubbleSubmitEvent={false}
          query={searchInput}
          indexPatterns={[indexPattern]}
          onChange={searchChangeHandler}
          onSubmit={applyInfluencersFilterQuery}
          placeholder={filterPlaceHolder}
          disableAutoFocus
          dataTestSubj="explorerQueryInput"
          languageSwitcherPopoverAnchorPosition="rightDown"
        />
      }
      isOpen={errorMessage?.query === searchInput.query && errorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessageQueryBar', {
          defaultMessage: 'Invalid query',
        })}
        {': '}
        {errorMessage?.message.split('\n')[0]}
      </EuiCode>
    </EuiInputPopover>
  );
};
