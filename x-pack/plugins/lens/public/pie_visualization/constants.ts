/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { LensIconChartDonut } from '../assets/chart_donut';
import { LensIconChartPie } from '../assets/chart_pie';
import { LensIconChartTreemap } from '../assets/chart_treemap';

export const CHART_NAMES = {
  donut: {
    icon: LensIconChartDonut,
    label: i18n.translate('xpack.lens.pie.donutLabel', {
      defaultMessage: 'Donut',
    }),
  },
  pie: {
    icon: LensIconChartPie,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
  },
  treemap: {
    icon: LensIconChartTreemap,
    label: i18n.translate('xpack.lens.pie.treemaplabel', {
      defaultMessage: 'Treemap',
    }),
  },
};

export const MAX_PIE_BUCKETS = 3;
export const MAX_TREEMAP_BUCKETS = 2;

export const DEFAULT_PERCENT_DECIMALS = 2;
