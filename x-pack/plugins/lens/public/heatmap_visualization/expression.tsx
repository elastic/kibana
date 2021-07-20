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
import type {
  IInterpreterRenderHandlers,
  ExpressionFunctionDefinition,
} from '../../../../../src/plugins/expressions';
import type { LensBrushEvent, LensFilterEvent } from '../types';
import type { FormatFactory, LensMultiTable } from '../../common';
import { LENS_HEATMAP_RENDERER } from './constants';
import type { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { HeatmapChartReportable } from './chart_component';

import { HEATMAP_LEGEND_FUNCTION, HEATMAP_GRID_FUNCTION } from '../../common/expressions';
import type { HeatmapExpressionArgs, HeatmapExpressionProps, HeatmapRender } from './types';

export { heatmapGridConfig, heatmapLegendConfig } from '../../common/expressions';

export const HEATMAP_FUNCTION = 'lens_heatmap';
export const HEATMAP_FUNCTION_RENDERER = 'lens_heatmap_renderer';

export const heatmap: ExpressionFunctionDefinition<
  typeof HEATMAP_FUNCTION,
  LensMultiTable,
  HeatmapExpressionArgs,
  HeatmapRender
> = {
  name: HEATMAP_FUNCTION,
  type: 'render',
  help: i18n.translate('xpack.lens.heatmap.expressionHelpLabel', {
    defaultMessage: 'Heatmap renderer',
  }),
  args: {
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.heatmap.titleLabel', {
        defaultMessage: 'Title',
      }),
    },
    description: {
      types: ['string'],
      help: '',
    },
    xAccessor: {
      types: ['string'],
      help: '',
    },
    yAccessor: {
      types: ['string'],
      help: '',
    },
    valueAccessor: {
      types: ['string'],
      help: '',
    },
    shape: {
      types: ['string'],
      help: '',
    },
    palette: {
      default: `{theme "palette" default={system_palette name="default"} }`,
      help: '',
      types: ['palette'],
    },
    legend: {
      types: [HEATMAP_LEGEND_FUNCTION],
      help: i18n.translate('xpack.lens.heatmapChart.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    gridConfig: {
      types: [HEATMAP_GRID_FUNCTION],
      help: i18n.translate('xpack.lens.heatmapChart.gridConfig.help', {
        defaultMessage: 'Configure the heatmap layout.',
      }),
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: HeatmapExpressionArgs) {
    return {
      type: 'render',
      as: HEATMAP_FUNCTION_RENDERER,
      value: {
        data,
        args,
      },
    };
  },
};

export const getHeatmapRenderer = (dependencies: {
  formatFactory: Promise<FormatFactory>;
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
    const formatFactory = await dependencies.formatFactory;
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
            formatFactory={formatFactory}
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
