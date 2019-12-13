/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, PluginInitializerContext } from 'kibana/server';
import { DataPluginSetup } from '../../../../src/plugins/data/server';
import {
  ISqlSearchRequest,
  ISqlSearchResponse,
  IDemoDataResponse,
  IDemoDataRequest,
} from './types';
import { SQL_SEARCH_STRATEGY, ASYNC_DEMO_SEARCH_STRATEGY } from '../common';
import { sqlSearchStrategyProvider } from './sql_search_strategy';
import { demoSearchStrategyProvider } from './demo_search_strategy';

interface Deps {
  data: DataPluginSetup;
}

declare module '../../../../src/plugins/data/server' {
  export interface IRequestTypesMap {
    [SQL_SEARCH_STRATEGY]: ISqlSearchRequest;
    [ASYNC_DEMO_SEARCH_STRATEGY]: IDemoDataRequest;
  }

  export interface IResponseTypesMap {
    [SQL_SEARCH_STRATEGY]: ISqlSearchResponse;
    [ASYNC_DEMO_SEARCH_STRATEGY]: IDemoDataResponse;
  }
}

export interface ISearchesInProgress {
  [id: string]: {
    request: IDemoDataRequest;
    response: IDemoDataResponse;
    requestStartTime: number;
  };
}

export class AdvancedDataPlugin implements Plugin<void, void, Deps> {
  private searchesInProgress: ISearchesInProgress = {};

  constructor(private initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, deps: Deps) {
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      SQL_SEARCH_STRATEGY,
      sqlSearchStrategyProvider
    );
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ASYNC_DEMO_SEARCH_STRATEGY,
      () => demoSearchStrategyProvider(this.searchesInProgress)
    );
  }

  public start() {}
  public stop() {}
}
