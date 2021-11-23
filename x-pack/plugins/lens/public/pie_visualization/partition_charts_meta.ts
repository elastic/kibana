/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PartitionLayout } from '@elastic/charts';
import type { EuiIconProps } from '@elastic/eui';

import { LensIconChartDonut } from '../assets/chart_donut';
import { LensIconChartPie } from '../assets/chart_pie';
import { LensIconChartTreemap } from '../assets/chart_treemap';
import { LensIconChartMosaic } from '../assets/chart_mosaic';
import { LensIconChartWaffle } from '../assets/chart_waffle';

import type { SharedPieLayerState } from '../../common/expressions';
import type { PieChartTypes } from '../../common/expressions/pie_chart/types';

interface PartitionChartMeta {
  icon: ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => JSX.Element;
  label: string;
  partitionType: PartitionLayout;
  groupLabel: string;
  categoryOptions: Array<{
    value: SharedPieLayerState['categoryDisplay'];
    inputDisplay: string;
  }>;
  numberOptions: Array<{
    value: SharedPieLayerState['numberDisplay'];
    inputDisplay: string;
  }>;
  maxBuckets: number;
  isExperimental?: boolean;
  requiredMinDimensionCount?: number;
  legend?: {
    flat?: boolean;
    showValues?: boolean;
  };
}

const groupLabel = i18n.translate('xpack.lens.pie.groupLabel', {
  defaultMessage: 'Proportion',
});

const categoryOptions: PartitionChartMeta['categoryOptions'] = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showCategoriesLabel', {
      defaultMessage: 'Inside or outside',
    }),
  },
  {
    value: 'inside',
    inputDisplay: i18n.translate('xpack.lens.pieChart.fitInsideOnlyLabel', {
      defaultMessage: 'Inside only',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
    }),
  },
];

const categoryOptionsTreemap: PartitionChartMeta['categoryOptions'] = [
  {
    value: 'default',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showTreemapCategoriesLabel', {
      defaultMessage: 'Show labels',
    }),
  },
  {
    value: 'hide',
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
    }),
  },
];

const numberOptions: PartitionChartMeta['numberOptions'] = [
  {
    value: 'hidden',
    inputDisplay: i18n.translate('xpack.lens.pieChart.hiddenNumbersLabel', {
      defaultMessage: 'Hide from chart',
    }),
  },
  {
    value: 'percent',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showPercentValuesLabel', {
      defaultMessage: 'Show percent',
    }),
  },
  {
    value: 'value',
    inputDisplay: i18n.translate('xpack.lens.pieChart.showFormatterValuesLabel', {
      defaultMessage: 'Show value',
    }),
  },
];

export const PartitionChartsMeta: Record<PieChartTypes, PartitionChartMeta> = {
  donut: {
    icon: LensIconChartDonut,
    label: i18n.translate('xpack.lens.pie.donutLabel', {
      defaultMessage: 'Donut',
    }),
    partitionType: PartitionLayout.sunburst,
    groupLabel,
    categoryOptions,
    numberOptions,
    maxBuckets: 3,
  },
  pie: {
    icon: LensIconChartPie,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
    partitionType: PartitionLayout.sunburst,
    groupLabel,
    categoryOptions,
    numberOptions,
    maxBuckets: 3,
  },
  treemap: {
    icon: LensIconChartTreemap,
    label: i18n.translate('xpack.lens.pie.treemaplabel', {
      defaultMessage: 'Treemap',
    }),
    partitionType: PartitionLayout.treemap,
    groupLabel,
    categoryOptions: categoryOptionsTreemap,
    numberOptions,
    maxBuckets: 2,
  },
  mosaic: {
    icon: LensIconChartMosaic,
    label: i18n.translate('xpack.lens.pie.mosaiclabel', {
      defaultMessage: 'Mosaic',
    }),
    partitionType: PartitionLayout.mosaic,
    groupLabel,
    categoryOptions: [],
    numberOptions,
    maxBuckets: 2,
    isExperimental: true,
    requiredMinDimensionCount: 2,
  },
  waffle: {
    icon: LensIconChartWaffle,
    label: i18n.translate('xpack.lens.pie.wafflelabel', {
      defaultMessage: 'Waffle',
    }),
    partitionType: PartitionLayout.waffle,
    groupLabel,
    categoryOptions: [],
    numberOptions: [],
    maxBuckets: 1,
    isExperimental: true,
    legend: {
      flat: true,
      showValues: true,
    },
  },
};
