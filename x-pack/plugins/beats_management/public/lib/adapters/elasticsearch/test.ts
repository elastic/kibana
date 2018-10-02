/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AutocompleteSuggestion } from 'ui/autocomplete_providers';
import { ElasticsearchAdapter } from './adapter_types';

export class TestElasticsearchAdapter implements ElasticsearchAdapter {
  public async convertKueryToEsQuery(kuery: string): Promise<string> {
    return 'foo';
  }
  public async getSuggestions(
    kuery: string,
    selectionStart: any
  ): Promise<AutocompleteSuggestion[]> {
    return [];
  }
}
