/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import { ChartsPluginSetup } from '../../../../../../src/plugins/charts/public';
import { buildPalettes } from './palettes';

export interface PaletteSetupPlugins {
  expressions: ExpressionsSetup;
  charts: ChartsPluginSetup;
}

export class PaletteService {
  constructor() {}

  public setup(core: CoreSetup, plugins: PaletteSetupPlugins) {
    const serializablePalettes = buildPalettes(plugins);

    Object.values(serializablePalettes).forEach(({ expressionFunctionDefinition }) => {
      plugins.expressions.registerFunction(expressionFunctionDefinition);
    });

    const palettes = Object.fromEntries(
      Object.entries(
        serializablePalettes
      ).map(([id, { expressionFunctionDefinition, ...definition }]) => [id, definition])
    );

    return { palettes };
  }
}
