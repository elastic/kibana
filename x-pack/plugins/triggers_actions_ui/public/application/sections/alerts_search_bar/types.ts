/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Filter } from '@kbn/es-query';
import { SearchBarProps } from '@kbn/unified-search-plugin/public/search_bar/search_bar';
import { QuickFiltersMenuItem } from './quick_filters';

export type QueryLanguageType = 'lucene' | 'kuery';

export interface AlertsSearchBarProps
  extends Omit<Partial<SearchBarProps>, 'query' | 'onQueryChange' | 'onQuerySubmit'> {
  appName: string;
  disableQueryLanguageSwitcher?: boolean;
  rangeFrom?: string;
  rangeTo?: string;
  query?: string;
  filters?: Filter[];
  quickFilters?: QuickFiltersMenuItem[];
  showFilterBar?: boolean;
  showDatePicker?: boolean;
  showSubmitButton?: boolean;
  placeholder?: string;
  submitOnBlur?: boolean;
  ruleTypeIds?: string[];
  onQueryChange?: (query: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query?: string;
  }) => void;
  onQuerySubmit: (
    query: {
      dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
      query?: string;
    },
    isUpdate?: boolean
  ) => void;
  onFiltersUpdated?: (filters: Filter[]) => void;
  filtersForSuggestions?: Filter[];
}
