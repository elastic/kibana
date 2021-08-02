/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionFunctionDefinition } from 'src/plugins/expressions';
import { CoreStart } from 'src/core/public';

export interface ExpressionFunctionDefinitionFactoryParams<StartPlugins> {
  coreStart: CoreStart;
  startPlugins: StartPlugins;
}

export type ExpressionFunctionDefinitionFactory<
  StartPlugins extends {} | void,
  Fn extends ExpressionFunctionDefinition<any, unknown, any, unknown, any>
> = (params: ExpressionFunctionDefinitionFactoryParams<StartPlugins>) => () => Fn;
