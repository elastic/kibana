/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from 'src/plugins/expressions/common';
import type { LensMultiTable } from '../../../../../lens/common';
import type { ChoroplethConfig } from './types';

interface ChoroplethRender {
  type: 'render';
  as: 'lens_choropleth_chart_renderer';
  value: ChoroplethChartProps;
}

export interface ChoroplethChartProps {
  data: LensMultiTable;
  args: ChoroplethConfig;
}

export const choroplethChart: ExpressionFunctionDefinition<
  'lens_choropleth_chart',
  LensMultiTable,
  Omit<ChoroplethConfig, 'layerId' | 'layerType'>,
  ChoroplethRender
> = {
  name: 'lens_choropleth_chart',
  type: 'render',
  help: 'A choropleth chart',
  args: {
    accessor: {
      types: ['string'],
      help: 'accessor',
    },
    title: {
      types: ['string'],
      help: i18n.translate('xpack.lens.metric.title.help', {
        defaultMessage: 'The chart title.',
      }),
    },
    description: {
      types: ['string'],
      help: '',
    },
    emsField: {
      types: ['string'],
      help: 'emsField',
    },
    emsLayerId: {
      types: ['string'],
      help: 'emsLayerId',
    },
    bucketColumnId: {
      types: ['string'],
      help: 'bucketColumnId',
    },
    metricColumnId: {
      types: ['string'],
      help: 'metricColumnId',
    },
    isPreview: {
      types: ['boolean'],
      help: 'When true, map is displayed as lens preview',
    }
  },
  inputTypes: ['lens_multitable'],
  fn(data, args) {
    return {
      type: 'render',
      as: 'lens_choropleth_chart_renderer',
      value: {
        data,
        args,
      },
    } as ChoroplethRender;
  },
};