/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ArrayEntry, PartitionLayout } from '@elastic/charts';
import type { EuiIconProps } from '@elastic/eui';

import { LensIconChartDonut } from '../assets/chart_donut';
import { LensIconChartPie } from '../assets/chart_pie';
import { LensIconChartTreemap } from '../assets/chart_treemap';
import { LensIconChartMosaic } from '../assets/chart_mosaic';
import { LensIconChartWaffle } from '../assets/chart_waffle';
import { EMPTY_SIZE_RATIOS } from './constants';

import type { SharedPieLayerState } from '../../common/expressions';
import type { PieChartTypes } from '../../common/expressions/pie_chart/types';
import type { DatatableColumn } from '../../../../../src/plugins/expressions';

interface PartitionChartMeta {
  icon: ({ title, titleId, ...props }: Omit<EuiIconProps, 'type'>) => JSX.Element;
  label: string;
  partitionType: PartitionLayout;
  groupLabel: string;
  maxBuckets: number;
  isExperimental?: boolean;
  requiredMinDimensionCount?: number;
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
      value: EMPTY_SIZE_RATIOS;
      label: string;
    }>;
  };
  legend: {
    flat?: boolean;
    showValues?: boolean;
    getShowLegendDefault?: (bucketColumns: DatatableColumn[]) => boolean;
  };
  sortPredicate?: (
    bucketColumns: DatatableColumn[],
    sortingMap: Record<string, number>
  ) => (node1: ArrayEntry, node2: ArrayEntry) => number;
}

const groupLabel = i18n.translate('xpack.lens.pie.groupLabel', {
  defaultMessage: 'Proportion',
});

const categoryOptions: PartitionChartMeta['toolbarPopover']['categoryOptions'] = [
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

const categoryOptionsTreemap: PartitionChartMeta['toolbarPopover']['categoryOptions'] = [
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

const numberOptions: PartitionChartMeta['toolbarPopover']['numberOptions'] = [
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

const emptySizeRatioOptions: PartitionChartMeta['toolbarPopover']['emptySizeRatioOptions'] = [
  {
    id: 'emptySizeRatioOption-small',
    value: EMPTY_SIZE_RATIOS.SMALL,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.small', {
      defaultMessage: 'Small',
    }),
  },
  {
    id: 'emptySizeRatioOption-medium',
    value: EMPTY_SIZE_RATIOS.MEDIUM,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    id: 'emptySizeRatioOption-large',
    value: EMPTY_SIZE_RATIOS.LARGE,
    label: i18n.translate('xpack.lens.pieChart.emptySizeRatioOptions.large', {
      defaultMessage: 'Large',
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
    maxBuckets: 3,
    toolbarPopover: {
      categoryOptions,
      numberOptions,
      emptySizeRatioOptions,
    },
    legend: {
      getShowLegendDefault: (bucketColumns) => bucketColumns.length > 1,
    },
  },
  pie: {
    icon: LensIconChartPie,
    label: i18n.translate('xpack.lens.pie.pielabel', {
      defaultMessage: 'Pie',
    }),
    partitionType: PartitionLayout.sunburst,
    groupLabel,
    maxBuckets: 3,
    toolbarPopover: {
      categoryOptions,
      numberOptions,
    },
    legend: {
      getShowLegendDefault: (bucketColumns) => bucketColumns.length > 1,
    },
  },
  treemap: {
    icon: LensIconChartTreemap,
    label: i18n.translate('xpack.lens.pie.treemaplabel', {
      defaultMessage: 'Treemap',
    }),
    partitionType: PartitionLayout.treemap,
    groupLabel,
    maxBuckets: 2,
    toolbarPopover: {
      categoryOptions: categoryOptionsTreemap,
      numberOptions,
    },
    legend: {
      getShowLegendDefault: () => false,
    },
  },
  mosaic: {
    icon: LensIconChartMosaic,
    label: i18n.translate('xpack.lens.pie.mosaiclabel', {
      defaultMessage: 'Mosaic',
    }),
    partitionType: PartitionLayout.mosaic,
    groupLabel,
    maxBuckets: 2,
    isExperimental: true,
    toolbarPopover: {
      categoryOptions: [],
      numberOptions,
    },
    legend: {
      getShowLegendDefault: () => false,
    },
    requiredMinDimensionCount: 2,
    sortPredicate:
      (bucketColumns, sortingMap) =>
      ([name1, node1], [, node2]) => {
        // Sorting for first group
        if (bucketColumns.length === 1 || (node1.children.length && name1 in sortingMap)) {
          return sortingMap[name1];
        }
        // Sorting for second group
        return node2.value - node1.value;
      },
  },
  waffle: {
    icon: LensIconChartWaffle,
    label: i18n.translate('xpack.lens.pie.wafflelabel', {
      defaultMessage: 'Waffle',
    }),
    partitionType: PartitionLayout.waffle,
    groupLabel,
    maxBuckets: 1,
    isExperimental: true,
    toolbarPopover: {
      isDisabled: true,
      categoryOptions: [],
      numberOptions: [],
    },
    legend: {
      flat: true,
      showValues: true,
      getShowLegendDefault: () => true,
    },
    sortPredicate:
      () =>
      ([, node1], [, node2]) =>
        node2.value - node1.value,
  },
};
