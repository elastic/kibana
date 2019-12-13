/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { toMountPoint } from '../../../../src/plugins/kibana_react/public';
import { IUiActionsSetup, IUiActionsApi } from '../../../../src/plugins/ui_actions/public';
import { ExpressionsSetup, ExpressionsStart } from '../../../../src/plugins/expressions/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
  ES_SEARCH_STRATEGY,
} from '../../../../src/plugins/data/public';
import {
  Plugin,
  CoreSetup,
  PluginInitializerContext,
  CoreStart,
} from '../../../../src/core/public';
import {
  CONTEXT_MENU_TRIGGER,
  IEmbeddableSetup,
  IEmbeddableStart,
  EmbeddableFactory,
} from '../../../../src/plugins/embeddable/public';
import { SQL_SEARCH_STRATEGY, ASYNC_DEMO_SEARCH_STRATEGY, ASYNC_SEARCH_STRATEGY } from '../common';
import {
  ISqlSearchRequest,
  ISqlSearchResponse,
  IDemoDataRequest,
  IDemoDataResponse,
} from './types';
import { sqlSearchStrategyProvider } from './search/sql_search_strategy';
import { esSql } from './expressions/es_sql';
import { createEditExpressionEmbeddableAction } from './ui_actions/edit_expression_embeddable_action';
import { ExpressionEmbeddableFactory, EXPRESSION_EMBEDDABLE } from './embeddable';
import { getSearchCollectorFactoryFn } from './search';
import { demoSearch } from './expressions/demo_search';
import { debug } from './expressions/debug';
import { demoClientSearchStrategyProvider } from './search/demo_search_strategy';
import { asyncSearchStrategyProvider } from './search/async_search_strategy';
import { enhancedEsSearchStrategyProvider } from './search/es_search_strategy';
import { getBgSearchCollections, BackgroundSearchCollection } from './search/bg_search_collection';
import { SearchCollectionsList } from './search/search_collections_list';

interface SetupDeps {
  data: DataPublicPluginSetup;
  uiActions: IUiActionsSetup;
  embeddable: IEmbeddableSetup;
  expressions: ExpressionsSetup;
}

interface StartDeps {
  data: DataPublicPluginStart;
  embeddable: IEmbeddableStart;
  uiActions: IUiActionsApi;
  expressions: ExpressionsStart;
}

declare module '../../../../src/plugins/data/public' {
  export interface IRequestTypesMap {
    [SQL_SEARCH_STRATEGY]: ISqlSearchRequest;
    [ASYNC_DEMO_SEARCH_STRATEGY]: IDemoDataRequest;
  }

  export interface IResponseTypesMap {
    [SQL_SEARCH_STRATEGY]: ISqlSearchResponse;
    [ASYNC_DEMO_SEARCH_STRATEGY]: IDemoDataResponse;
  }
}

export class AdvancedDataPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  constructor(private initializerContext: PluginInitializerContext) {}
  public setup(
    core: CoreSetup<{ embeddable: IEmbeddableStart; data: DataPublicPluginStart }>,
    deps: SetupDeps
  ) {
    deps.data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      SQL_SEARCH_STRATEGY,
      sqlSearchStrategyProvider
    );

    deps.expressions.registerFunction(() => esSql());
    deps.expressions.registerFunction(() => demoSearch());
    deps.expressions.registerRenderer(() => debug());

    const { data } = deps;
    deps.data.search.setSearchCollectorFactory(getSearchCollectorFactoryFn(core.getStartServices));
    data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ASYNC_SEARCH_STRATEGY,
      asyncSearchStrategyProvider
    );
    data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ES_SEARCH_STRATEGY,
      enhancedEsSearchStrategyProvider
    );

    data.search.registerSearchStrategyProvider(
      this.initializerContext.opaqueId,
      ASYNC_DEMO_SEARCH_STRATEGY,
      demoClientSearchStrategyProvider
    );
  }

  public start(core: CoreStart, deps: StartDeps) {
    const editExpression = createEditExpressionEmbeddableAction(core.overlays.openModal);
    deps.uiActions.registerAction(editExpression);
    deps.uiActions.attachAction(CONTEXT_MENU_TRIGGER, editExpression.id);

    deps.embeddable.registerEmbeddableFactory(
      EXPRESSION_EMBEDDABLE,
      new ExpressionEmbeddableFactory(deps.expressions.ExpressionLoader) as EmbeddableFactory
    );
    // (async () => {
    //   const bgSearchObjects = await getBgSearchCollections(core.savedObjects.client);
    //   const bgSearches: BackgroundSearchCollection[] = bgSearchObjects.map(
    //     s => s.attributes as BackgroundSearchCollection
    //   );
    //   core.notifications.toasts.add(
    //     {
    //       text: toMountPoint(<SearchCollectionsList backgroundSearches={bgSearches} />),
    //     },
    //     9999999999
    //   );
    // })();
  }

  public stop() {}
}
