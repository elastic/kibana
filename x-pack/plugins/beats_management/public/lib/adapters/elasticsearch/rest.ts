/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { ElasticsearchAdapter } from './adapter_types';
import { QuerySuggestion, esKuery } from '../../../../../../../src/plugins/data/public';
import { services } from '../../../kbn_services';

export class RestElasticsearchAdapter implements ElasticsearchAdapter {
  private cachedIndexPattern: any = null;
  constructor(private readonly indexPatternName: string) {}

  public isKueryValid(kuery: string): boolean {
    try {
      esKuery.fromKueryExpression(kuery);
    } catch (err) {
      return false;
    }

    return true;
  }
  public async convertKueryToEsQuery(kuery: string): Promise<string> {
    if (!this.isKueryValid(kuery)) {
      return '';
    }
    const ast = esKuery.fromKueryExpression(kuery);
    const indexPattern = await this.getIndexPattern();
    return JSON.stringify(esKuery.toElasticsearchQuery(ast, indexPattern));
  }

  public async getSuggestions(kuery: string, selectionStart: any): Promise<QuerySuggestion[]> {
    const indexPattern = await this.getIndexPattern();

    return (
      (await services.dataStart.autocomplete.getQuerySuggestions({
        language: 'kuery',
        indexPatterns: [indexPattern],
        boolFilter: [],
        query: kuery || '',
        selectionStart,
        selectionEnd: selectionStart,
      })) || []
    );
  }

  private async getIndexPattern() {
    if (this.cachedIndexPattern) {
      return this.cachedIndexPattern;
    }
    const res = await services.dataStart.indexPatterns.getFieldsForWildcard({
      pattern: this.indexPatternName,
    });
    if (isEmpty(res.fields)) {
      return;
    }
    this.cachedIndexPattern = {
      fields: res.fields,
      title: `${this.indexPatternName}`,
    };
    return this.cachedIndexPattern;
  }
}
