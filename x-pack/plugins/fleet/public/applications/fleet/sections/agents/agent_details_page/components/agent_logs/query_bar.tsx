/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useState, useEffect } from 'react';
import { EuiSuggest, EuiSuggestItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  QuerySuggestion,
  IFieldType,
} from '../../../../../../../../../../../src/plugins/data/public';
import { useStartServices, useDebounce } from '../../../../../hooks';
import { transformSuggestionType } from '../../../../../components/search_bar';
import { AGENT_LOG_INDEX_PATTERN } from './constants';

export const LogQueryBar: React.FunctionComponent<{
  query: string;
  onUpdateQuery: (query: string, runQuery?: boolean) => void;
  isQueryValid: boolean;
}> = memo(({ query, onUpdateQuery, isQueryValid }) => {
  const { data } = useStartServices();
  const [isSearchBarLoading, setIsSearchBarLoading] = useState<boolean>(true);
  const [querySuggestions, setQuerySuggestions] = useState<QuerySuggestion[]>();
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    const fetchSuggestions = async () => {
      setIsSearchBarLoading(true);
      const fields = (await data.indexPatterns.getFieldsForWildcard({
        pattern: AGENT_LOG_INDEX_PATTERN,
      })) as IFieldType[];

      // TODO: strip out irrelevant fields such as data_stream.* and elastic_agent.*
      try {
        const suggestions = await data.autocomplete.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [
            {
              title: AGENT_LOG_INDEX_PATTERN,
              fields,
            },
          ],
          query: debouncedQuery,
          selectionStart: debouncedQuery.length,
          selectionEnd: debouncedQuery.length,
        });

        setQuerySuggestions(suggestions);
      } catch (err) {
        setQuerySuggestions([]);
      }

      setIsSearchBarLoading(false);
    };
    fetchSuggestions();
  }, [data.autocomplete, data.indexPatterns, debouncedQuery]);

  return (
    <EuiSuggest
      // @ts-ignore
      value={query}
      icon="search"
      isLoading={isSearchBarLoading}
      isInvalid={!isQueryValid}
      placeholder={i18n.translate('xpack.fleet.agentLogs.searchPlaceholderText', {
        defaultMessage: 'Search logs…',
      })}
      onInputChange={(target) => {
        // @ts-ignore
        onUpdateQuery(target.value);
      }}
      onItemClick={(suggestion: EuiSuggestItemProps) => {
        onUpdateQuery(`${query} ${suggestion.label}`, true);
      }}
      suggestions={(querySuggestions || []).map((suggestion) => {
        return {
          label: suggestion.text,
          type: transformSuggestionType(suggestion.type),
        };
      })}
    />
  );
});
