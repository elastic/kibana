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
import {
  ExpressionFunctionDefinition,
  IInterpreterRenderHandlers,
} from '../../../../../src/plugins/expressions';
import { FormatFactory, LensFilterEvent, LensMultiTable } from '../types';
import { FUNCTION_NAME, LENS_HEATMAP_RENDERER } from './constants';
import { HeatmapExpressionArgs, HeatmapExpressionProps, HeatmapRender } from './types';
import { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';
import { HeatmapChartReportable } from './chart_component';

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
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: HeatmapExpressionArgs) {
    console.log(data, '___data___');
    console.log(args, '___args___');
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
    console.log(config, '___config___');
    ReactDOM.render(
      <I18nProvider>{<HeatmapChartReportable {...config} />}</I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});
