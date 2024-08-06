/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { LensPublicSetup } from '@kbn/lens-plugin/public';
import type { MapsPluginStartDependencies } from '../../plugin';
import { getExpressionFunction } from './expression_function';
import { getExpressionRenderer } from './expression_renderer';

export function setupLensChoroplethChart(
  coreSetup: CoreSetup<MapsPluginStartDependencies>,
  expressions: ExpressionsSetup,
  lens: LensPublicSetup
) {
  expressions.registerRenderer(() => {
    return getExpressionRenderer(coreSetup);
  });

  expressions.registerFunction(getExpressionFunction);

  lens.registerVisualization(async () => {
    const [coreStart, plugins]: [CoreStart, MapsPluginStartDependencies, unknown] =
      await coreSetup.getStartServices();
    const { getVisualization } = await import('./visualization');

    return getVisualization({
      theme: coreStart.theme,
      paletteService: await plugins.charts.palettes.getPalettes(),
    });
  });
}
