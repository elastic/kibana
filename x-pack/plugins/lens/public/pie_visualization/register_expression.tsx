/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { PartialTheme } from '@elastic/charts';
import {
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
  ExpressionFunctionDefinition,
} from 'src/plugins/expressions/public';
import { LensMultiTable, FormatFactory } from '../types';
import { PieExpressionProps, PieExpressionArgs } from './types';
import { getExecuteTriggerActions } from './services';
import { PieComponent } from './render_function';

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
    slices: {
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
      options: ['default', 'link', 'inside', 'hide'],
      help: '',
    },
    legendDisplay: {
      types: ['string'],
      options: ['default', 'nested', 'hide'],
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
  chartTheme: PartialTheme;
  isDarkMode: boolean;
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
    const executeTriggerActions = getExecuteTriggerActions();
    const formatFactory = await dependencies.formatFactory;
    ReactDOM.render(
      <MemoizedChart
        {...config}
        {...dependencies}
        formatFactory={formatFactory}
        executeTriggerActions={executeTriggerActions}
        isDarkMode={dependencies.isDarkMode}
      />,
      domNode,
      () => {
        handlers.done();
      }
    );
    handlers.onDestroy(() => ReactDOM.unmountComponentAtNode(domNode));
  },
});

const MemoizedChart = React.memo(PieComponent);
