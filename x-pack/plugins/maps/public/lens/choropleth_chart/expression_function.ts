/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import { i18n } from '@kbn/i18n';
import type { LensMultiTable } from '../../../../lens/common';
import type { ChoroplethChartConfig, ChoroplethChartProps } from './types';
import { RENDERER_ID } from './expression_renderer';
import { prepareLogTable } from '../../../../../../src/plugins/visualizations/common/utils';

interface ChoroplethChartRender {
  type: 'render';
  as: 'lens_choropleth_chart_renderer';
  value: ChoroplethChartProps;
}

export const getExpressionFunction = (): ExpressionFunctionDefinition<
  'lens_choropleth_chart',
  LensMultiTable,
  Omit<ChoroplethChartConfig, 'layerType'>,
  ChoroplethChartRender
> => ({
  name: 'lens_choropleth_chart',
  type: 'render',
  help: 'A choropleth chart. Metrics are joined to vector features to compare values across political boundaries',
  args: {
    title: {
      types: ['string'],
      help: '',
    },
    description: {
      types: ['string'],
      help: '',
    },
    layerId: {
      types: ['string'],
      help: '',
    },
    emsField: {
      types: ['string'],
      help: 'Elastic Map Service boundaries layer field provides the vector feature join key',
    },
    emsLayerId: {
      types: ['string'],
      help: 'Elastic Map Service boundaries layer id that provides vector features',
    },
    regionAccessor: {
      types: ['string'],
      help: 'Bucket accessor identifies the region key column',
    },
    valueAccessor: {
      types: ['string'],
      help: 'Value accessor identifies the value column',
    },
  },
  inputTypes: ['lens_multitable'],
  fn(data, args, handlers) {
    if (handlers?.inspectorAdapters?.tables) {
      const logTable = prepareLogTable(
        Object.values(data.tables)[0],
        [
          [
            args.valueAccessor ? [args.valueAccessor] : undefined,
            i18n.translate('xpack.maps.logDatatable.value', {
              defaultMessage: 'Value',
            }),
          ],
          [
            args.regionAccessor ? [args.regionAccessor] : undefined,
            i18n.translate('xpack.maps.logDatatable.region', {
              defaultMessage: 'Region key',
            }),
          ],
        ],
        true
      );

      handlers.inspectorAdapters.tables.logDatatable('default', logTable);
    }
    return {
      type: 'render',
      as: RENDERER_ID,
      value: {
        data,
        args,
      },
    } as ChoroplethChartRender;
  },
});
