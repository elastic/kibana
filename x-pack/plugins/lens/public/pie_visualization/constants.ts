/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PartitionLayout } from '@elastic/charts';
import { LensIconChartDonut } from '../assets/chart_donut';
import { LensIconChartPie } from '../assets/chart_pie';
import { LensIconChartTreemap } from '../assets/chart_treemap';
import { LensIconChartMosaic } from '../assets/chart_mosaic';

import type { SharedPieLayerState } from '../../common/expressions';

interface CategoryOption {
  value: SharedPieLayerState['categoryDisplay'];
  inputDisplay: string;
}

const groupLabel = i18n.translate('xpack.lens.pie.groupLabel', {
  defaultMessage: 'Proportion',
});

const categoryOptions: CategoryOption[] = [
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

const categoryOptionsTreemap: CategoryOption[] = [
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

export const CHART_NAMES = {
  donut: {
    icon: LensIconChartDonut,
    label: i18n.translate('xpack.lens.pie.donutLabel', {
      defaultMessage: 'Donut',
    }),
    partitionType: PartitionLayout.sunburst,
    groupLabel,
    categoryOptions,
  },
  pie: {
    icon: LensIconChartPie,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
    partitionType: PartitionLayout.sunburst,
    groupLabel,
    categoryOptions,
  },
  treemap: {
    icon: LensIconChartTreemap,
    label: i18n.translate('xpack.lens.pie.treemaplabel', {
      defaultMessage: 'Treemap',
    }),
    partitionType: PartitionLayout.treemap,
    groupLabel,
    categoryOptions: categoryOptionsTreemap,
  },
  mosaic: {
    icon: LensIconChartMosaic,
    label: i18n.translate('xpack.lens.pie.mosaiclabel', {
      defaultMessage: 'Mosaic',
    }),
    partitionType: PartitionLayout.mosaic,
    groupLabel,
    categoryOptions: [] as CategoryOption[],
  },
};

export const MAX_PIE_BUCKETS = 3;
export const MAX_TREEMAP_BUCKETS = 2;
export const MAX_MOSAIC_BUCKETS = 2;

export const DEFAULT_PERCENT_DECIMALS = 2;
