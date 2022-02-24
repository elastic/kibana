/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { ExpressionsSetup, IInterpreterRenderHandlers } from 'src/plugins/expressions/public';
import type { CoreSetup, CoreStart } from 'src/core/public';
import type { LensPublicSetup } from '../../../../lens/public';
import type { MapsPluginStartDependencies } from '../../plugin';
import type { ChoroplethChartProps } from './types';
import { getExpressionFunction } from './expression_function';

export function setupLensChoroplethChart(
  coreSetup: CoreSetup<MapsPluginStartDependencies>,
  expressions: ExpressionsSetup,
  lens: LensPublicSetup
) {
  expressions.registerRenderer(() => {
    return {
      name: 'lens_choroplethmap_chart_renderer',
      displayName: 'Choropleth chart',
      help: 'Choropleth chart renderer',
      validate: () => undefined,
      reuseDomNode: true,
      render: async (
        domNode: Element,
        config: ChoroplethChartProps,
        handlers: IInterpreterRenderHandlers
      ) => {
        const [coreStart, plugins]: [CoreStart, MapsPluginStartDependencies, unknown] =
          await coreSetup.getStartServices();
        const { ChoroplethChart } = await import('./choropleth_chart');
        ReactDOM.render(
          <ChoroplethChart
            {...config}
            formatFactory={plugins.fieldFormats.deserialize}
            uiSettings={coreStart.uiSettings}
          />,
          domNode,
          () => {
            handlers.done();
          }
        );
        handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
      },
    };
  });

  expressions.registerFunction(getExpressionFunction);

  lens.registerVisualization(async () => {
    const [coreStart, plugins]: [CoreStart, MapsPluginStartDependencies, unknown] =
      await coreSetup.getStartServices();
    const { getEmsFileLayers } = await import('../../util');
    const { getVisualization } = await import('./visualization');
    return getVisualization({
      theme: coreStart.theme,
      emsFileLayers: await getEmsFileLayers(),
      paletteService: await plugins.charts.palettes.getPalettes(),
    });
  });
}
