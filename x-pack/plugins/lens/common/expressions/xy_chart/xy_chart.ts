/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { ExpressionFunctionDefinition } from '../../../../../../src/plugins/expressions/common';
import type { ExpressionValueSearchContext } from '../../../../../../src/plugins/data/common';
import type { LensMultiTable } from '../../types';
import type { XYArgs } from './xy_args';
import { fittingFunctionDefinitions } from './fitting_function';
import { endValueDefinitions } from './end_value';
import { logDataTable } from '../expressions_utils';

export interface XYChartProps {
  data: LensMultiTable;
  args: XYArgs;
}

export interface XYRender {
  type: 'render';
  as: 'lens_xy_chart_renderer';
  value: XYChartProps;
}

export const xyChart: ExpressionFunctionDefinition<
  'lens_xy_chart',
  LensMultiTable | ExpressionValueSearchContext | null,
  XYArgs,
  XYRender
> = {
  name: 'lens_xy_chart',
  type: 'render',
  inputTypes: ['lens_multitable', 'kibana_context', 'null'],
  help: i18n.translate('xpack.lens.xyChart.help', {
    defaultMessage: 'An X/Y chart',
  }),
  args: {
    title: {
      types: ['string'],
      help: 'The chart title.',
    },
    description: {
      types: ['string'],
      help: '',
    },
    xTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.xTitle.help', {
        defaultMessage: 'X axis title',
      }),
    },
    yTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.yLeftTitle.help', {
        defaultMessage: 'Y left axis title',
      }),
    },
    yRightTitle: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.yRightTitle.help', {
        defaultMessage: 'Y right axis title',
      }),
    },
    yLeftExtent: {
      types: ['lens_xy_axisExtentConfig'],
      help: i18n.translate('xpack.lens.xyChart.yLeftExtent.help', {
        defaultMessage: 'Y left axis extents',
      }),
    },
    yRightExtent: {
      types: ['lens_xy_axisExtentConfig'],
      help: i18n.translate('xpack.lens.xyChart.yRightExtent.help', {
        defaultMessage: 'Y right axis extents',
      }),
    },
    legend: {
      types: ['lens_xy_legendConfig'],
      help: i18n.translate('xpack.lens.xyChart.legend.help', {
        defaultMessage: 'Configure the chart legend.',
      }),
    },
    fittingFunction: {
      types: ['string'],
      options: [...fittingFunctionDefinitions.map(({ id }) => id)],
      help: i18n.translate('xpack.lens.xyChart.fittingFunction.help', {
        defaultMessage: 'Define how missing values are treated',
      }),
    },
    endValue: {
      types: ['string'],
      options: [...endValueDefinitions.map(({ id }) => id)],
      help: '',
    },
    emphasizeFitting: {
      types: ['boolean'],
      default: false,
      help: '',
    },
    valueLabels: {
      types: ['string'],
      options: ['hide', 'inside'],
      help: '',
    },
    tickLabelsVisibilitySettings: {
      types: ['lens_xy_tickLabelsConfig'],
      help: i18n.translate('xpack.lens.xyChart.tickLabelsSettings.help', {
        defaultMessage: 'Show x and y axes tick labels',
      }),
    },
    labelsOrientation: {
      types: ['lens_xy_labelsOrientationConfig'],
      help: i18n.translate('xpack.lens.xyChart.labelsOrientation.help', {
        defaultMessage: 'Defines the rotation of the axis labels',
      }),
    },
    gridlinesVisibilitySettings: {
      types: ['lens_xy_gridlinesConfig'],
      help: i18n.translate('xpack.lens.xyChart.gridlinesSettings.help', {
        defaultMessage: 'Show x and y axes gridlines',
      }),
    },
    axisTitlesVisibilitySettings: {
      types: ['lens_xy_axisTitlesVisibilityConfig'],
      help: i18n.translate('xpack.lens.xyChart.axisTitlesSettings.help', {
        defaultMessage: 'Show x and y axes titles',
      }),
    },
    layers: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      types: ['lens_xy_data_layer', 'lens_xy_referenceLine_layer'] as any,
      help: 'Layers of visual series',
      multi: true,
    },
    curveType: {
      types: ['string'],
      options: ['LINEAR', 'CURVE_MONOTONE_X'],
      help: i18n.translate('xpack.lens.xyChart.curveType.help', {
        defaultMessage: 'Define how curve type is rendered for a line chart',
      }),
    },
    fillOpacity: {
      types: ['number'],
      help: i18n.translate('xpack.lens.xyChart.fillOpacity.help', {
        defaultMessage: 'Define the area chart fill opacity',
      }),
    },
    hideEndzones: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('xpack.lens.xyChart.hideEndzones.help', {
        defaultMessage: 'Hide endzone markers for partial data',
      }),
    },
    valuesInLegend: {
      types: ['boolean'],
      default: false,
      help: i18n.translate('xpack.lens.xyChart.valuesInLegend.help', {
        defaultMessage: 'Show values in legend',
      }),
    },
    ariaLabel: {
      types: ['string'],
      help: i18n.translate('xpack.lens.xyChart.ariaLabel.help', {
        defaultMessage: 'Specifies the aria label of the xy chart',
      }),
      required: false,
    },
  },
  fn(data: LensMultiTable, args: XYArgs, handlers) {
    if (handlers?.inspectorAdapters?.tables) {
      logDataTable(handlers.inspectorAdapters.tables, data.tables);
    }
    return {
      type: 'render',
      as: 'lens_xy_chart_renderer',
      value: {
        data,
        args: {
          ...args,
          ariaLabel:
            args.ariaLabel ??
            (handlers.variables?.embeddableTitle as string) ??
            handlers.getExecutionContext?.()?.description,
        },
      },
    };
  },
};
