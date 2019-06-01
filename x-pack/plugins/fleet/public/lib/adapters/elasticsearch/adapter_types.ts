/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { AutocompleteSuggestion } from 'ui/autocomplete_providers';

export interface ElasticsearchAdapter {
  convertKueryToEsQuery: (kuery: string) => Promise<string>;
  getSuggestions: (kuery: string, selectionStart: any) => Promise<AutocompleteSuggestion[]>;
  isKueryValid(kuery: string): boolean;
}
