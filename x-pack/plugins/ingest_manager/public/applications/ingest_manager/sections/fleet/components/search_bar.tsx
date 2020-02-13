/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
// @ts-ignore
import { EuiSuggest, EuiSuggestItemProps } from '@elastic/eui';
import { useDebounce } from '../../../hooks';

const DEBOUNCE_SEARCH_MS = 150;

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
}

export const SearchBar: React.FC<Props> = ({ value, fieldPrefix, onChange }) => {
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
      placeholder={'Search'}
      onInputChange={onChangeSearch}
      onItemClick={onAutocompleteClick}
      suggestions={suggestions.map(suggestion => {
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
  // const { elasticsearch } = useLibs();
  const debouncedSearch = useDebounce(search, DEBOUNCE_SEARCH_MS);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const fetchSuggestions = async () => {
    // try {
    //   const esSuggestions = (
    //     await elasticsearch.getSuggestions(debouncedSearch, debouncedSearch.length, fieldPrefix)
    //   ).map((suggestion: any) => ({
    //     label: suggestion.text,
    //     description: suggestion.description || '',
    //     type: transformSuggestionType(suggestion.type),
    //     start: suggestion.start,
    //     end: suggestion.end,
    //     value: suggestion.text,
    //   }));
    //   setSuggestions(esSuggestions);
    // } catch (err) {
    //   setSuggestions([]);
    // }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  return {
    suggestions,
  };
}

// export class RestElasticsearchAdapter {
//   private cachedIndexPattern: any = null;
//   constructor(private readonly api: RestAPIAdapter, private readonly indexPatternName: string) {}

//   public isKueryValid(kuery: string): boolean {
//     try {
//       esKuery.fromKueryExpression(kuery);
//     } catch (err) {
//       return false;
//     }

//     return true;
//   }
//   public async convertKueryToEsQuery(kuery: string): Promise<string> {
//     if (!this.isKueryValid(kuery)) {
//       return '';
//     }
//     const ast = esKuery.fromKueryExpression(kuery);
//     const indexPattern = await this.getIndexPattern();
//     return JSON.stringify(esKuery.toElasticsearchQuery(ast, indexPattern));
//   }
//   public async getSuggestions(
//     kuery: string,
//     selectionStart: any
//   ): Promise<autocomplete.QuerySuggestion[]> {
//     const indexPattern = await this.getIndexPattern();
//     return (
//       (await npStart.plugins.data.autocomplete.getQuerySuggestions({
//         language: 'kuery',
//         indexPatterns: [indexPattern],
//         boolFilter: [],
//         query: kuery || '',
//         selectionStart,
//         selectionEnd: selectionStart,
//       })) || ([] as autocomplete.QuerySuggestion[])
//     );
//   }

//   private async getIndexPattern() {
//     if (this.cachedIndexPattern) {
//       return this.cachedIndexPattern;
//     }
//     const res = await this.api.get<any>(`/api/index_patterns/_fields_for_wildcard`, {
//       query: { pattern: this.indexPatternName },
//     });
//     if (isEmpty(res.fields)) {
//       return;
//     }
//     this.cachedIndexPattern = {
//       fields: res.fields,
//       title: `${this.indexPatternName}`,
//     };
//     return this.cachedIndexPattern;
//   }
// }
