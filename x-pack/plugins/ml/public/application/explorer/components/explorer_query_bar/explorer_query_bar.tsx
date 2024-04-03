/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { EuiCode, EuiInputPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import type { Query } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { QueryErrorMessage } from '@kbn/ml-error-utils';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import { PLUGIN_ID } from '../../../../../common/constants/app';
import { useAnomalyExplorerContext } from '../../anomaly_explorer_context';
import { useMlKibana } from '../../../contexts/kibana';

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
  queryString,
  searchInput,
}: {
  queryString?: string;
  searchInput?: Query;
}) {
  return {
    language: searchInput?.language ?? DEFAULT_QUERY_LANG,
    query: queryString ?? '',
  };
}

interface ExplorerQueryBarProps {
  filterActive: boolean;
  filterPlaceHolder?: string;
  indexPattern: DataView;
  queryString?: string;
  updateLanguage: (language: string) => void;
  dataViews?: DataView[];
}

export const ExplorerQueryBar: FC<ExplorerQueryBarProps> = ({
  filterActive,
  filterPlaceHolder,
  indexPattern,
  queryString,
  updateLanguage,
  dataViews = [],
}) => {
  const { anomalyExplorerCommonStateService } = useAnomalyExplorerContext();
  const { services } = useMlKibana();
  const {
    unifiedSearch: {
      ui: { QueryStringInput },
    },
  } = services;

  // The internal state of the input query bar updated on every key stroke.
  const [searchInput, setSearchInput] = useState<Query>(getInitSearchInputState({ queryString }));
  const [queryErrorMessage, setQueryErrorMessage] = useState<QueryErrorMessage | undefined>(
    undefined
  );

  useEffect(
    function updateSearchInputFromFilter() {
      setSearchInput(getInitSearchInputState({ queryString, searchInput }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryString, searchInput.language]
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
      setQueryErrorMessage({ query: query.query as string, message: e.message });
    }
  };

  return (
    <EuiInputPopover
      css={{ maxWidth: '100%' }}
      closePopover={setQueryErrorMessage.bind(null, undefined)}
      input={
        <QueryStringInput
          bubbleSubmitEvent={false}
          query={searchInput}
          indexPatterns={dataViews ?? []}
          onChange={searchChangeHandler}
          onSubmit={applyInfluencersFilterQuery}
          placeholder={filterPlaceHolder}
          disableAutoFocus
          dataTestSubj="explorerQueryInput"
          languageSwitcherPopoverAnchorPosition="rightDown"
          appName={PLUGIN_ID}
        />
      }
      isOpen={queryErrorMessage?.query === searchInput.query && queryErrorMessage?.message !== ''}
    >
      <EuiCode>
        {i18n.translate('xpack.ml.explorer.invalidKuerySyntaxErrorMessageQueryBar', {
          defaultMessage: 'Invalid query',
        })}
        {': '}
        {queryErrorMessage?.message.split('\n')[0]}
      </EuiCode>
    </EuiInputPopover>
  );
};
