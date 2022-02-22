/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreSetup, CoreStart } from 'src/core/public';
import type {
  ExpressionRenderDefinition,
  IInterpreterRenderHandlers,
} from 'src/plugins/expressions/public';
import type { MapsPluginStartDependencies } from '../../plugin';
import { ChoroplethChartProps } from './types';
// TODO load lazy
import { ChoroplethChart } from './choropleth_chart';

export const getExpressionRenderer = (
  coreSetup: CoreSetup<MapsPluginStartDependencies>
): ExpressionRenderDefinition<ChoroplethChartProps> => ({
  name: 'lens_choroplethmap_chart_renderer',
  displayName: 'Choropleth chart',
  help: 'Choropleth chart renderer',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (domNode: Element, config: ChoroplethChartProps, handlers: IInterpreterRenderHandlers) => {
    const [coreStart, plugins]: [CoreStart, MapsPluginStartDependencies, unknown] = await coreSetup.getStartServices();
    ReactDOM.render(
      <ChoroplethChart {...config} formatFactory={plugins.fieldFormats.deserialize} uiSettings={coreStart.uiSettings} />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});