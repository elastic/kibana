/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';
// import { METRIC_TYPE } from '@kbn/analytics';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { GraphPluginStartDependencies } from '../plugin';
import type { GraphChartProps } from './types';

export const RENDERER_ID = 'lens_graph_chart_renderer';

export function getExpressionRenderer(coreSetup: CoreSetup<GraphPluginStartDependencies>) {
  return {
    name: RENDERER_ID,
    displayName: 'Graph chart',
    help: 'Graph chart renderer',
    validate: () => undefined,
    reuseDomNode: true,
    render: async (
      domNode: Element,
      config: GraphChartProps,
      handlers: IInterpreterRenderHandlers
    ) => {
      const [_, plugins]: [CoreStart, GraphPluginStartDependencies, unknown] =
        await coreSetup.getStartServices();
      const { GraphRenderer } = await import('./renderer_wrapper');

      const renderComplete = () => {
        // plugins.usageCollection?.reportUiCounter(containerType, METRIC_TYPE.COUNT, [
        //   `render_graph`,
        // ]);

        handlers.done();
      };

      const [formatFactory, paletteService] = await Promise.all([
        plugins.fieldFormats.deserialize,
        plugins.charts.palettes.getPalettes(),
      ]);

      ReactDOM.render(
        <GraphRenderer {...config} formatFactory={formatFactory} paletteService={paletteService} />,
        domNode,
        renderComplete
      );
      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  };
}
