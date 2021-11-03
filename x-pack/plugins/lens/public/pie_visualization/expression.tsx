/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { i18n } from '@kbn/i18n';
import { I18nProvider } from '@kbn/i18n/react';
import type {
  IInterpreterRenderHandlers,
  ExpressionRenderDefinition,
} from 'src/plugins/expressions/public';
import type { LensFilterEvent } from '../types';
import { PieComponent } from './render_function';
import type { FormatFactory } from '../../common';
import type { PieExpressionProps } from '../../common/expressions';
import type { ChartsPluginSetup, PaletteRegistry } from '../../../../../src/plugins/charts/public';

export const getPieRenderer = (dependencies: {
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
}): ExpressionRenderDefinition<PieExpressionProps> => ({
  name: 'lens_pie_renderer',
  displayName: i18n.translate('xpack.lens.pie.visualizationName', {
    defaultMessage: 'Pie',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: (domNode: Element, config: PieExpressionProps, handlers: IInterpreterRenderHandlers) => {
    const onClickValue = (data: LensFilterEvent['data']) => {
      handlers.event({ name: 'filter', data });
    };

    ReactDOM.render(
      <I18nProvider>
        <MemoizedChart
          {...config}
          formatFactory={dependencies.formatFactory}
          chartsThemeService={dependencies.chartsThemeService}
          interactive={handlers.isInteractive()}
          paletteService={dependencies.paletteService}
          onClickValue={onClickValue}
          renderMode={handlers.getRenderMode()}
          syncColors={handlers.isSyncColorsEnabled()}
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
