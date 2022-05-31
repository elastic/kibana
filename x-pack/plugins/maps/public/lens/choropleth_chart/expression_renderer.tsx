/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/public';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { FileLayer } from '@elastic/ems-client';
import type { MapsPluginStartDependencies } from '../../plugin';
import type { ChoroplethChartProps } from './types';
import type { MapEmbeddableInput, MapEmbeddableOutput } from '../../embeddable';

export const RENDERER_ID = 'lens_choropleth_chart_renderer';

export function getExpressionRenderer(coreSetup: CoreSetup<MapsPluginStartDependencies>) {
  return {
    name: RENDERER_ID,
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
      const { getEmsFileLayers } = await import('../../util');

      const mapEmbeddableFactory = plugins.embeddable.getEmbeddableFactory(
        'map'
      ) as EmbeddableFactory<MapEmbeddableInput, MapEmbeddableOutput>;
      if (!mapEmbeddableFactory) {
        return;
      }

      let emsFileLayers: FileLayer[] = [];
      try {
        emsFileLayers = await getEmsFileLayers();
      } catch (error) {
        // ignore error, lack of EMS file layers will be surfaced in dimension editor
      }

      ReactDOM.render(
        <ChoroplethChart
          {...config}
          formatFactory={plugins.fieldFormats.deserialize}
          uiSettings={coreStart.uiSettings}
          emsFileLayers={emsFileLayers}
          mapEmbeddableFactory={mapEmbeddableFactory}
        />,
        domNode,
        () => {
          handlers.done();
        }
      );
      handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
    },
  };
}
