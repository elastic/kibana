/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import { GraphPluginStartDependencies } from '../plugin';
import { graphDecorationFn } from './expression_decoration_fn';
import { getExpressionFunction } from './expression_fn';
import { getExpressionRenderer } from './expression_renderer';
import { getVisualization } from './visualization';

export function setupLensGraphChart(
  coreSetup: CoreSetup<GraphPluginStartDependencies>,
  expressions: ExpressionsSetup,
  lens: LensPublicSetup
) {
  expressions.registerRenderer(() => {
    return getExpressionRenderer(coreSetup);
  });

  expressions.registerFunction(graphDecorationFn);
  expressions.registerFunction(getExpressionFunction);

  lens.registerVisualization(async () => {
    const [coreStart, plugins]: [CoreStart, GraphPluginStartDependencies, unknown] =
      await coreSetup.getStartServices();

    return getVisualization({
      theme: coreStart.theme,
      paletteService: await plugins.charts.palettes.getPalettes(),
    });
  });
}
