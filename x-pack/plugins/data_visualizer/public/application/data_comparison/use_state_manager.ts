/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { Filter, Query } from '@kbn/es-query';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '@kbn/ml-query-utils';
import { RANDOM_SAMPLER_OPTION, RandomSampler } from '@kbn/ml-random-sampler-utils';
import { RandomSamplerOption } from '../index_data_visualizer/constants/random_sampler';

export const defaultSearchQuery = {
  match_all: {},
};

export class StateManager {
  private timeFieldName?: string;
  private _id: string = 'dataDriftStateManager';

  private indexPattern$ = new BehaviorSubject<string>('');
  private searchString$ = new BehaviorSubject<Query['query']>('');
  private query$ = new BehaviorSubject<estypes.QueryDslQueryContainer>(defaultSearchQuery);
  private searchQueryLanguage$ = new BehaviorSubject<SearchQueryLanguage>(
    SEARCH_QUERY_LANGUAGE.KUERY
  );
  filters$ = new BehaviorSubject<Filter[]>([]);
  private randomSamplerMode$ = new BehaviorSubject<RandomSamplerOption>(
    RANDOM_SAMPLER_OPTION.ON_AUTOMATIC
  );
  private randomSamplerProbability$ = new BehaviorSubject<number | null>();
  private _randomSampler = new RandomSampler();

  // private randomSamplerMode: (mode: RandomSamplerOption) => void;
  // private randomSamplerProbability: (prob: RandomSamplerProbability) => void;

  constructor({
    id,
    indexPattern,
    searchString,
    searchQuery,
    searchQueryLanguage,
    filters,
    timeFieldName,
  }) {
    this._id = id;
    this.indexPattern$.next(indexPattern);
    this.searchString$.next(searchString);
    this.query$.next(searchQuery);
    this.searchQueryLanguage$.next(searchQueryLanguage);
    this.filters$.next(filters);
    this.timeFieldName = timeFieldName;
  }

  public setRandomSamplerMode(mode: RandomSamplerOption) {
    this.randomSamplerMode$.next(mode);
  }

  public getRandomSamplerMode() {
    return this.randomSamplerMode$.getValue();
  }

  public getQuery() {
    return this.query$.getValue();
  }

  public setQuery(q: estypes.QueryDslQueryContainer) {
    this.query$.next(q);
  }

  public get randomSampler() {
    return this._randomSampler;
  }

  public get searchString() {
    return this.searchString$.getValue();
  }
  public get searchQueryLanguage() {
    return this.searchQueryLanguage$.getValue();
  }
  public get id() {
    return this._id;
  }
  // public setFilters(f: Filter[]) {
  //   this.filters$.next(f);
  // }
  //
  // public getFilters$() {
  //   return this.filters$;
  // }
}

export const DataComparisonStateManagerContext = createContext<{
  dataView: DataView | never;
  reference: StateManager;
  production: StateManager;
}>({
  get dataView(): never {
    throw new Error('DataComparisonStateManagerContext is not implemented');
  },
  get reference(): never {
    throw new Error('reference is not implemented');
  },
  get production(): never {
    throw new Error('production is not implemented');
  },
});

export function useDataComparisonStateManagerContext() {
  return useContext(DataComparisonStateManagerContext);
}
