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
import type { IInterpreterRenderHandlers } from '../../../../../../src/plugins/expressions';
import type { FormatFactory } from '../../../common';
import { LENS_GAUGE_RENDERER } from './constants';
import type {
  ChartsPluginSetup,
  PaletteRegistry,
} from '../../../../../../src/plugins/charts/public';
import { GaugeChartReportable } from './chart_component';
import type { GaugeExpressionProps } from '../../../common/expressions';

export const getGaugeRenderer = (dependencies: {
  formatFactory: FormatFactory;
  chartsThemeService: ChartsPluginSetup['theme'];
  paletteService: PaletteRegistry;
}) => ({
  name: LENS_GAUGE_RENDERER,
  displayName: i18n.translate('xpack.lens.gauge.visualizationName', {
    defaultMessage: 'Gauge',
  }),
  help: '',
  validate: () => undefined,
  reuseDomNode: true,
  render: async (
    domNode: Element,
    config: GaugeExpressionProps,
    handlers: IInterpreterRenderHandlers
  ) => {
    ReactDOM.render(
      <I18nProvider>
        {
          <MemoizedChart
            {...config}
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

const MemoizedChart = React.memo(GaugeChartReportable);
