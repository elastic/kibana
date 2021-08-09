/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFlattenedObject } from '@kbn/std';
import { estypes } from '@elastic/elasticsearch';
import { esKuery } from '../../../../../../src/plugins/data/server';

import { DeepPartial } from '../utils/utility_types';
import { mergeFields } from '../utils/fields';
import { EventLogParams } from './internal_api';
import { IEventQueryBuilder, IEventQuery, SortingParams, PaginationParams } from './public_api';
import { EventQuery } from './event_query';

export class EventQueryBuilder<TEvent> implements IEventQueryBuilder<TEvent> {
  private readonly params: EventLogParams;
  private loggerName: string;
  private fields: DeepPartial<TEvent> | null;
  private kql: string;
  private sorting: SortingParams;
  private pagination: PaginationParams;

  constructor(params: EventLogParams) {
    this.params = params;
    this.loggerName = '';
    this.fields = null;
    this.kql = '';
    this.sorting = [{ '@timestamp': { order: 'desc' } }, { 'event.sequence': { order: 'desc' } }];
    this.pagination = { page: 1, perPage: 20 };
  }

  public filterByLogger(loggerName: string): IEventQueryBuilder<TEvent> {
    this.loggerName = loggerName;
    return this;
  }

  public filterByFields(fields: DeepPartial<TEvent>): IEventQueryBuilder<TEvent> {
    this.fields = mergeFields(this.fields ?? {}, fields);
    return this;
  }

  public filterByKql(kql: string): IEventQueryBuilder<TEvent> {
    this.kql = kql;
    return this;
  }

  public sortBy(params: SortingParams): IEventQueryBuilder<TEvent> {
    this.sorting = params;
    return this;
  }

  public paginate(params: PaginationParams): IEventQueryBuilder<TEvent> {
    this.pagination = params;
    return this;
  }

  public buildQuery(): IEventQuery<TEvent> {
    const { indexReader } = this.params;
    const { page, perPage } = this.pagination;

    const request: estypes.SearchRequest = {
      track_total_hits: true,
      body: {
        from: (page - 1) * perPage,
        size: perPage,
        sort: this.sorting,
        query: {
          bool: {
            filter: this.buildFilter(),
          },
        },
      },
    };

    return new EventQuery<TEvent>({ indexReader, request });
  }

  private buildFilter(): estypes.QueryDslQueryContainer[] {
    const result: estypes.QueryDslQueryContainer[] = [];

    if (this.loggerName) {
      result.push({
        term: { 'kibana.event_log.logger_name': this.loggerName },
      });
    }

    if (this.fields) {
      const flatFields = getFlattenedObject(this.fields);
      Object.entries(flatFields)
        .map(([key, value]) => {
          const queryName = Array.isArray(value) ? 'terms' : 'term';
          return { [queryName]: { [key]: value } };
        })
        .forEach((query) => {
          result.push(query);
        });
    }

    if (this.kql) {
      const dsl = esKuery.toElasticsearchQuery(esKuery.fromKueryExpression(this.kql));
      const queries = Array.isArray(dsl) ? dsl : [dsl];
      result.push(...queries);
    }

    return result;
  }
}
