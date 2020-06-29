/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import {
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
  ExpressionFunctionDefinition,
} from 'src/plugins/expressions/public';
import { LensMultiTable, FormatFactory, LensFilterEvent } from '../types';
import { PieExpressionProps, PieExpressionArgs } from './types';
import { PieComponent } from './render_function';
import { ChartsPluginSetup } from '../../../../../src/plugins/charts/public';

export interface PieRender {
  type: 'render';
  as: 'lens_pie_renderer';
  value: PieExpressionProps;
}

export const pie: ExpressionFunctionDefinition<
  'lens_pie',
  LensMultiTable,
  PieExpressionArgs,
  PieRender
> = {
  name: 'lens_pie',
  type: 'render',
  help: i18n.translate('xpack.lens.pie.expressionHelpLabel', {
    defaultMessage: 'Pie renderer',
  }),
  args: {
    groups: {
      types: ['string'],
      multi: true,
      help: '',
    },
    metric: {
      types: ['string'],
      help: '',
    },
    shape: {
      types: ['string'],
      options: ['pie', 'donut', 'treemap'],
      help: '',
    },
    hideLabels: {
      types: ['boolean'],
      help: '',
    },
    numberDisplay: {
      types: ['string'],
      options: ['hidden', 'percent', 'value'],
      help: '',
    },
    categoryDisplay: {
      types: ['string'],
      options: ['default', 'inside', 'hide'],
      help: '',
    },
    legendDisplay: {
      types: ['string'],
      options: ['default', 'show', 'hide'],
      help: '',
    },
    nestedLegend: {
      types: ['boolean'],
      help: '',
    },
    percentDecimals: {
      types: ['number'],
      help: '',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data: LensMultiTable, args: PieExpressionArgs) {
    return {
      type: 'render',
      as: 'lens_pie_renderer',
      value: {
        data,
        args,
      },
    };
  },
};

export const getPieRenderer = (dependencies: {
  formatFactory: Promise<FormatFactory>;
  chartsThemeService: ChartsPluginSetup['theme'];
}): ExpressionRenderDefinition<PieExpressionProps> => ({
  name: 'lens_pie_renderer',
  displayName: i18n.translate('xpack.lens.pie.visualizationName', {
    defaultMessage: 'Pie',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: PieExpressionProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    const onClickValue = (data: LensFilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };
    const formatFactory = await dependencies.formatFactory;
    ReactDOM.render(
      <I18nProvider>
        <MemoizedChart
          {...config}
          formatFactory={formatFactory}
          chartsThemeService={dependencies.chartsThemeService}
          onClickValue={onClickValue}
        />
      </I18nProvider>,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

const MemoizedChart = React.memo(PieComponent);
