/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import { IFieldType } from 'src/plugins/data/public';
// @ts-ignore
import { EuiSuggest, EuiSuggestItemProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebounce, useStartDeps } from '../hooks';
import { INDEX_NAME, AGENT_SAVED_OBJECT_TYPE } from '../constants';

const DEBOUNCE_SEARCH_MS = 150;
const HIDDEN_FIELDS = [`${AGENT_SAVED_OBJECT_TYPE}.actions`];

interface Suggestion {
  label: string;
  description: string;
  value: string;
  type: {
    color: string;
    iconType: string;
  };
  start: number;
  end: number;
}

interface Props {
  value: string;
  fieldPrefix: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
}

export const SearchBar: React.FunctionComponent<Props> = ({
  value,
  fieldPrefix,
  onChange,
  placeholder,
}) => {
  const { suggestions } = useSuggestions(fieldPrefix, value);

  // TODO fix type when correctly typed in EUI
  const onAutocompleteClick = (suggestion: any) => {
    onChange(
      [value.slice(0, suggestion.start), suggestion.value, value.slice(suggestion.end, -1)].join('')
    );
  };
  // TODO fix type when correctly typed in EUI
  const onChangeSearch = (e: any) => {
    onChange(e.value);
  };

  return (
    <EuiSuggest
      // TODO fix when correctly typed
      // @ts-ignore
      value={value}
      icon={'search'}
      placeholder={
        placeholder ||
        i18n.translate('xpack.ingestManager.defaultSearchPlaceholderText', {
          defaultMessage: 'Search',
        })
      }
      onInputChange={onChangeSearch}
      onItemClick={onAutocompleteClick}
      suggestions={suggestions.map((suggestion) => {
        return {
          ...suggestion,
          // For type
          onClick: () => {},
        };
      })}
    />
  );
};

function transformSuggestionType(type: string): { iconType: string; color: string } {
  switch (type) {
    case 'field':
      return { iconType: 'kqlField', color: 'tint4' };
    case 'value':
      return { iconType: 'kqlValue', color: 'tint0' };
    case 'conjunction':
      return { iconType: 'kqlSelector', color: 'tint3' };
    case 'operator':
      return { iconType: 'kqlOperand', color: 'tint1' };
    default:
      return { iconType: 'kqlOther', color: 'tint1' };
  }
}

function useSuggestions(fieldPrefix: string, search: string) {
  const { data } = useStartDeps();

  const debouncedSearch = useDebounce(search, DEBOUNCE_SEARCH_MS);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fetchSuggestions = async () => {
    try {
      const res = (await data.indexPatterns.getFieldsForWildcard({
        pattern: INDEX_NAME,
      })) as IFieldType[];
      if (!data || !data.autocomplete) {
        throw new Error('Missing data plugin');
      }
      const query = debouncedSearch || '';
      // @ts-ignore
      const esSuggestions = (
        await data.autocomplete.getQuerySuggestions({
          language: 'kuery',
          indexPatterns: [
            {
              title: INDEX_NAME,
              fields: res,
            },
          ],
          boolFilter: [],
          query,
          selectionStart: query.length,
          selectionEnd: query.length,
        })
      )
        .filter((suggestion) => {
          if (suggestion.type === 'conjunction') {
            return true;
          }
          if (suggestion.type === 'value') {
            return true;
          }
          if (suggestion.type === 'operator') {
            return true;
          }

          if (fieldPrefix && suggestion.text.startsWith(fieldPrefix)) {
            for (const hiddenField of HIDDEN_FIELDS) {
              if (suggestion.text.startsWith(hiddenField)) {
                return false;
              }
            }
            return true;
          }

          return false;
        })
        .map((suggestion: any) => ({
          label: suggestion.text,
          description: suggestion.description || '',
          type: transformSuggestionType(suggestion.type),
          start: suggestion.start,
          end: suggestion.end,
          value: suggestion.text,
        }));

      setSuggestions(esSuggestions);
    } catch (err) {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return {
    suggestions,
  };
}
