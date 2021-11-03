/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import ReactDOM from 'react-dom';
import React from 'react';
import type { IInterpreterRenderHandlers } from '../../../../../src/plugins/expressions';
import type { LensBrushEvent, LensFilterEvent } from '../types';
import type { FormatFactory } from '../../common';
import { LENS_HEATMAP_RENDERER } from './constants';
import type { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { HeatmapChartReportable } from './chart_component';
import type { HeatmapExpressionProps } from './types';

export const getHeatmapRenderer = (dependencies: {
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
  timeZone: string;
}) => ({
  name: LENS_HEATMAP_RENDERER,
  displayName: i18n.translate('xpack.lens.heatmap.visualizationName', {
    defaultMessage: 'Heatmap',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: HeatmapExpressionProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    const onClickValue = (data: LensFilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const onSelectRange = (data: LensBrushEvent['data']) => {
      handlers.event({ name: 'brush', data });
    };

    ReactDOM.render(
      <I18nProvider>
        {
          <HeatmapChartReportable
            {...config}
            onClickValue={onClickValue}
            onSelectRange={onSelectRange}
            timeZone={dependencies.timeZone}
            formatFactory={dependencies.formatFactory}
            chartsThemeService={dependencies.chartsThemeService}
            paletteService={dependencies.paletteService}
          />
        }
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );

    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
