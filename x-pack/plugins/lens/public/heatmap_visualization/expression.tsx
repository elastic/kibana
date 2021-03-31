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
import { Position } from '@elastic/charts';
import {
  ExpressionFunctionDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions';
import { FormatFactory, LensMultiTable } from '../types';
import { FUNCTION_NAME, LEGEND_FUNCTION, LENS_HEATMAP_RENDERER } from './constants';
import type {
  HeatmapExpressionArgs,
  HeatmapExpressionProps,
  HeatmapRender,
  LegendConfigResult,
} from './types';
import { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { HeatmapChartReportable } from './chart_component';
import { LegendConfig } from './types';

/**
 * TODO check if it's possible to make a shared function
 * based on the XY chart
 */
export const heatmapLegendConfig: ExpressionFunctionDefinition<
  typeof LEGEND_FUNCTION,
  null,
  LegendConfig,
  LegendConfigResult
> = {
  name: LEGEND_FUNCTION,
  aliases: [],
  type: LEGEND_FUNCTION,
  help: `Configure the heatmap chart's legend`,
  inputTypes: ['null'],
  args: {
    isVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('xpack.lens.heatmapChart.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
    },
  },
  fn: function fn(input: unknown, args: LegendConfig) {
    return {
      type: LEGEND_FUNCTION,
      ...args,
    };
  },
};

export const heatmap: ExpressionFunctionDefinition<
  typeof FUNCTION_NAME,
  LensMultiTable,
  HeatmapExpressionArgs,
  HeatmapRender
> = {
  name: FUNCTION_NAME,
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
      types: [LEGEND_FUNCTION],
      help: i18n.translate('xpack.lens.heatmapChart.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: HeatmapExpressionArgs) {
    return {
      type: 'render',
      as: LENS_HEATMAP_RENDERER,
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
    ReactDOM.render(
      <I18nProvider>
        {
          <HeatmapChartReportable
            {...config}
            timeZone={dependencies.timeZone}
            formatFactory={formatFactory}
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
