/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare module 'ui/index_patterns' {
  export type IndexPattern = any;

  export interface StaticIndexPatternField {
    name: string;
    type: string;
    aggregatable: boolean;
    searchable: boolean;
  }

  export interface StaticIndexPattern {
    fields: StaticIndexPatternField[];
    title: string;
  }
}

declare module 'ui/autocomplete_providers' {
  import { StaticIndexPattern } from 'ui/index_patterns';

  export type AutocompleteProvider = (
    args: {
      config: {
        get(configKey: string): any;
      };
      indexPatterns: StaticIndexPattern[];
      boolFilter: any;
    }
  ) => GetSuggestions;

  export type GetSuggestions = (
    args: {
      query: string;
      selectionStart: number;
      selectionEnd: number;
    }
  ) => Promise<AutocompleteSuggestion[]>;

  export type AutocompleteSuggestionType = 'field' | 'value' | 'operator' | 'conjunction';

  export interface AutocompleteSuggestion {
    description: string;
    end: number;
    start: number;
    text: string;
    type: AutocompleteSuggestionType;
  }

  export function addAutocompleteProvider(language: string, provider: AutocompleteProvider): void;

  export function getAutocompleteProvider(language: string): AutocompleteProvider | undefined;
}
