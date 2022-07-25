/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteRegistry } from '@kbn/coloring';
import { asset } from './asset';
import { filtersFunctionFactory } from './filters';
import { timelionFunctionFactory } from './timelion';
import { toFunctionFactory } from './to';
import { CanvasSetupDeps, CoreSetup } from '../plugin';
import { plotFunctionFactory } from './plot';
import { pieFunctionFactory } from './pie';

export interface InitializeArguments {
  prependBasePath: CoreSetup['http']['basePath']['prepend'];
  paletteService: PaletteRegistry;
  types: ReturnType<CanvasSetupDeps['expressions']['getTypes']>;
  timefilter: CanvasSetupDeps['data']['query']['timefilter']['timefilter'];
}

export function initFunctions(initialize: InitializeArguments) {
  return [
    asset,
    filtersFunctionFactory(initialize),
    timelionFunctionFactory(initialize),
    toFunctionFactory(initialize),
    pieFunctionFactory(initialize.paletteService),
    plotFunctionFactory(initialize.paletteService),
  ];
}
