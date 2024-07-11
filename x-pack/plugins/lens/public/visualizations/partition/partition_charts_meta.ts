/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EuiIconProps, IconType } from '@elastic/eui';

import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import {
  IconChartPie,
  IconChartTreemap,
  IconChartMosaic,
  IconChartWaffle,
  IconDonutHoleSmall,
  IconDonutHoleMedium,
  IconDonutHoleLarge,
} from '@kbn/chart-icons';
import type { PartitionLegendValue } from '@kbn/visualizations-plugin/common/constants';
import { LegendValue } from '@elastic/charts';
import { SharedPieLayerState, EmptySizeRatios } from '../../../common/types';
import { CategoryDisplay, NumberDisplay } from '../../../common/constants';
import type { PieChartType } from '../../../common/types';

interface PartitionChartMeta {
  id: string;
  icon: ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => JSX.Element;
  label: string;
  maxBuckets: number;
  showExperimentalBadge?: boolean;
  sortPriority: number;
  description: string;
  toolbarPopover: {
    isDisabled?: boolean;
    categoryOptions: Array<{
      value: SharedPieLayerState['categoryDisplay'];
      inputDisplay: string;
    }>;
    numberOptions: Array<{
      value: SharedPieLayerState['numberDisplay'];
      inputDisplay: string;
    }>;
    emptySizeRatioOptions?: Array<{
      id: string;
      value: EmptySizeRatios | 0;
      label: string;
      icon?: IconType;
    }>;
  };
  legend: {
    flat?: boolean;
    defaultLegendStats?: PartitionLegendValue[];
    hideNestedLegendSwitch?: boolean;
    getShowLegendDefault?: (bucketColumns: DatatableColumn[]) => boolean;
  };
}

const categoryOptions: PartitionChartMeta['toolbarPopover']['categoryOptions'] = [
  {
    value: CategoryDisplay.DEFAULT,
    inputDisplay: i18n.translate('xpack.lens.pieChart.showCategoriesLabel', {
      defaultMessage: 'Inside or outside',
    }),
  },
  {
    value: CategoryDisplay.INSIDE,
    inputDisplay: i18n.translate('xpack.lens.pieChart.fitInsideOnlyLabel', {
      defaultMessage: 'Inside only',
    }),
  },
  {
    value: CategoryDisplay.HIDE,
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
    }),
  },
];

const categoryOptionsTreemap: PartitionChartMeta['toolbarPopover']['categoryOptions'] = [
  {
    value: CategoryDisplay.DEFAULT,
    inputDisplay: i18n.translate('xpack.lens.pieChart.showTreemapCategoriesLabel', {
      defaultMessage: 'Show labels',
    }),
  },
  {
    value: CategoryDisplay.HIDE,
    inputDisplay: i18n.translate('xpack.lens.pieChart.categoriesInLegendLabel', {
      defaultMessage: 'Hide labels',
    }),
  },
];

const numberOptions: PartitionChartMeta['toolbarPopover']['numberOptions'] = [
  {
    value: NumberDisplay.HIDDEN,
    inputDisplay: i18n.translate('xpack.lens.pieChart.hiddenNumbersLabel', {
      defaultMessage: 'Hide from chart',
    }),
  },
  {
    value: NumberDisplay.PERCENT,
    inputDisplay: i18n.translate('xpack.lens.pieChart.showPercentValuesLabel', {
      defaultMessage: 'Show percent',
    }),
  },
  {
    value: NumberDisplay.VALUE,
    inputDisplay: i18n.translate('xpack.lens.pieChart.showFormatterValuesLabel', {
      defaultMessage: 'Show value',
    }),
  },
];

const emptySizeRatioOptions: PartitionChartMeta['toolbarPopover']['emptySizeRatioOptions'] = [
  {
    id: 'emptySizeRatioOption-none',
    value: 0,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.none', {
      defaultMessage: 'None',
    }),
  },
  {
    id: 'emptySizeRatioOption-small',
    icon: IconDonutHoleSmall,
    value: EmptySizeRatios.SMALL,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: 'emptySizeRatioOption-medium',
    value: EmptySizeRatios.MEDIUM,
    icon: IconDonutHoleMedium,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: 'emptySizeRatioOption-large',
    value: EmptySizeRatios.LARGE,
    icon: IconDonutHoleLarge,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.large', {
      defaultMessage: 'Large',
    }),
  },
];

export const PartitionChartsMeta: Record<PieChartType, PartitionChartMeta> = {
  pie: {
    id: 'pie',
    icon: IconChartPie,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
    maxBuckets: 3,
    toolbarPopover: {
      categoryOptions,
      numberOptions,
      emptySizeRatioOptions, // todo: change how it works!
    },
    legend: {
      getShowLegendDefault: (bucketColumns) => bucketColumns.length > 1,
    },
    sortPriority: 6,
    description: i18n.translate('xpack.lens.pie.visualizationDescription', {
      defaultMessage: 'Display proportions of a whole in a circular format.',
    }),
  },
  donut: {
    id: 'donut',
    icon: IconChartPie,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
    maxBuckets: 3,
    toolbarPopover: {
      categoryOptions,
      numberOptions,
      emptySizeRatioOptions, // todo: change how it works!
    },
    legend: {
      getShowLegendDefault: (bucketColumns) => bucketColumns.length > 1,
    },
    sortPriority: 6,
    description: i18n.translate('xpack.lens.pie.visualizationDescription', {
      defaultMessage: 'Display proportions of a whole in a circular format.',
    }),
  },
  waffle: {
    id: 'waffle',
    icon: IconChartWaffle,
    label: i18n.translate('xpack.lens.pie.wafflelabel', {
      defaultMessage: 'Waffle',
    }),
    maxBuckets: 1,
    toolbarPopover: {
      isDisabled: true,
      categoryOptions: [],
      numberOptions: [],
    },
    legend: {
      flat: true,
      defaultLegendStats: [LegendValue.Value],
      hideNestedLegendSwitch: true,
      getShowLegendDefault: () => true,
    },
    sortPriority: 9,
    description: i18n.translate('xpack.lens.waffle.visualizationDescription', {
      defaultMessage: 'Represent data proportions via a grid of colored cells.',
    }),
  },
  treemap: {
    id: 'treemap',
    icon: IconChartTreemap,
    label: i18n.translate('xpack.lens.pie.treemaplabel', {
      defaultMessage: 'Treemap',
    }),
    maxBuckets: 2,
    toolbarPopover: {
      categoryOptions: categoryOptionsTreemap,
      numberOptions,
    },
    legend: {
      getShowLegendDefault: () => false,
    },
    sortPriority: 11,
    description: i18n.translate('xpack.lens.treemap.visualizationDescription', {
      defaultMessage: 'Use nested rectangles to show proportionality.',
    }),
  },
  mosaic: {
    id: 'mosaic',
    icon: IconChartMosaic,
    label: i18n.translate('xpack.lens.pie.mosaiclabel', {
      defaultMessage: 'Mosaic',
    }),
    maxBuckets: 2,
    toolbarPopover: {
      categoryOptions: [],
      numberOptions,
    },
    legend: {
      getShowLegendDefault: () => false,
    },
    sortPriority: 13,
    description: i18n.translate('xpack.lens.mosaic.visualizationDescription', {
      defaultMessage: 'Show proportions of categorical data via rectangles.',
    }),
  },
};

export const chartSwitchOptions = [
  {
    ...PartitionChartsMeta.pie,
    subtypes: ['pie', 'donut'],
  },
  PartitionChartsMeta.waffle,
  PartitionChartsMeta.treemap,
  PartitionChartsMeta.mosaic,
];
