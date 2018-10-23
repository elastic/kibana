/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import { ElasticsearchAdapter } from './adapter_types';

export class MemoryElasticsearchAdapter implements ElasticsearchAdapter {
  constructor(
    private readonly mockIsKueryValid: (kuery: string) => boolean,
    private readonly mockKueryToEsQuery: (kuery: string) => string,
    private readonly suggestions: AutocompleteSuggestion[]
  ) {}

  public isKueryValid(kuery: string): boolean {
    return this.mockIsKueryValid(kuery);
  }
  public async convertKueryToEsQuery(kuery: string): Promise<string> {
    return this.mockKueryToEsQuery(kuery);
  }
  public async getSuggestions(
    kuery: string,
    selectionStart: any
  ): Promise<AutocompleteSuggestion[]> {
    return this.suggestions;
  }
}
