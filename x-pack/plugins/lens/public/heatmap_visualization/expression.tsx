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
import { FormatFactory, LensBrushEvent, LensFilterEvent, LensMultiTable } from '../types';
import {
  FUNCTION_NAME,
  HEATMAP_GRID_FUNCTION,
  LEGEND_FUNCTION,
  LENS_HEATMAP_RENDERER,
} from './constants';
import type {
  HeatmapExpressionArgs,
  HeatmapExpressionProps,
  HeatmapGridConfig,
  HeatmapGridConfigResult,
  HeatmapRender,
  LegendConfigResult,
} from './types';
import { HeatmapLegendConfig } from './types';
import { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { HeatmapChartReportable } from './chart_component';

export const heatmapGridConfig: ExpressionFunctionDefinition<
  typeof HEATMAP_GRID_FUNCTION,
  null,
  HeatmapGridConfig,
  HeatmapGridConfigResult
> = {
  name: HEATMAP_GRID_FUNCTION,
  aliases: [],
  type: HEATMAP_GRID_FUNCTION,
  help: `Configure the heatmap layout `,
  inputTypes: ['null'],
  args: {
    // grid
    strokeWidth: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.strokeWidth.help', {
        defaultMessage: 'Specifies the grid stroke width',
      }),
      required: false,
    },
    strokeColor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.heatmapChart.config.strokeColor.help', {
        defaultMessage: 'Specifies the grid stroke color',
      }),
      required: false,
    },
    cellHeight: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.cellHeight.help', {
        defaultMessage: 'Specifies the grid cell height',
      }),
      required: false,
    },
    cellWidth: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.cellWidth.help', {
        defaultMessage: 'Specifies the grid cell width',
      }),
      required: false,
    },
    // cells
    isCellLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.config.isCellLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the cell label is visible.',
      }),
    },
    // Y-axis
    isYAxisLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.config.isYAxisLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the Y-axis labels are visible.',
      }),
    },
    yAxisLabelWidth: {
      types: ['number'],
      help: i18n.translate('xpack.lens.heatmapChart.config.yAxisLabelWidth.help', {
        defaultMessage: 'Specifies the width of the Y-axis labels.',
      }),
      required: false,
    },
    yAxisLabelColor: {
      types: ['string'],
      help: i18n.translate('xpack.lens.heatmapChart.config.yAxisLabelColor.help', {
        defaultMessage: 'Specifies the color of the Y-axis labels.',
      }),
      required: false,
    },
    // X-axis
    isXAxisLabelVisible: {
      types: ['boolean'],
      help: i18n.translate('xpack.lens.heatmapChart.config.isXAxisLabelVisible.help', {
        defaultMessage: 'Specifies whether or not the X-axis labels are visible.',
      }),
    },
  },
  fn(input, args) {
    return {
      type: HEATMAP_GRID_FUNCTION,
      ...args,
    };
  },
};

/**
 * TODO check if it's possible to make a shared function
 * based on the XY chart
 */
export const heatmapLegendConfig: ExpressionFunctionDefinition<
  typeof LEGEND_FUNCTION,
  null,
  HeatmapLegendConfig,
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
      help: i18n.translate('xpack.lens.heatmapChart.legend.isVisible.help', {
        defaultMessage: 'Specifies whether or not the legend is visible.',
      }),
    },
    position: {
      types: ['string'],
      options: [Position.Top, Position.Right, Position.Bottom, Position.Left],
      help: i18n.translate('xpack.lens.heatmapChart.legend.position.help', {
        defaultMessage: 'Specifies the legend position.',
      }),
    },
  },
  fn(input, args) {
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
