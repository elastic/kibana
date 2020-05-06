/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import chartDonutSVG from '../assets/chart_donut.svg';
import chartPieSVG from '../assets/chart_pie.svg';
import chartTreemapSVG from '../assets/chart_treemap.svg';

export const CHART_NAMES = {
  donut: {
    icon: chartDonutSVG,
    label: i18n.translate('xpack.lens.pie.donutLabel', {
      defaultMessage: 'Donut',
    }),
  },
  pie: {
    icon: chartPieSVG,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
  },
  treemap: {
    icon: chartTreemapSVG,
    label: i18n.translate('xpack.lens.pie.treemaplabel', {
      defaultMessage: 'Treemap',
    }),
  },
};

export const MAX_PIE_BUCKETS = 3;
export const MAX_TREEMAP_BUCKETS = 2;

export const DEFAULT_PERCENT_DECIMALS = 3;
