/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QuerySuggestion } from '../../../../../../../src/plugins/data/public';
import { ElasticsearchAdapter } from './adapter_types';

export class MemoryElasticsearchAdapter implements ElasticsearchAdapter {
  constructor(
    private readonly mockIsKueryValid: (kuery: string) => boolean,
    private readonly mockKueryToEsQuery: (kuery: string) => string,
    private readonly suggestions: QuerySuggestion[]
  ) {}

  public isKueryValid(kuery: string): boolean {
    return this.mockIsKueryValid(kuery);
  }
  public async convertKueryToEsQuery(kuery: string): Promise<string> {
    return this.mockKueryToEsQuery(kuery);
  }
  public async getSuggestions(kuery: string, selectionStart: any): Promise<QuerySuggestion[]> {
    return this.suggestions;
  }
}
