/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LensConfigWithId } from '../../../types';
import { formulas } from '../formulas';
import {
  DEFAULT_XY_FITTING_FUNCTION,
  DEFAULT_XY_HIDDEN_AXIS_TITLE,
  DEFAULT_XY_LEGEND,
  DISK_IOPS_LABEL,
} from '../../../shared/charts/constants';

const dockerContainerDiskIOReadWrite: LensConfigWithId = {
  id: 'diskIOReadWrite',
  chartType: 'xy',
  title: DISK_IOPS_LABEL,
  layers: [
    {
      seriesType: 'area',
      type: 'series',
      xAxis: '@timestamp',
      yAxis: [
        {
          ...formulas.dockerContainerDiskIORead,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.read', {
            defaultMessage: 'Read',
          }),
        },
        {
          ...formulas.dockerContainerDiskIOWrite,
          label: i18n.translate('xpack.metricsData.assetDetails.metricsCharts.metric.label.write', {
            defaultMessage: 'Write',
          }),
        },
      ],
    },
  ],
  ...DEFAULT_XY_FITTING_FUNCTION,
  ...DEFAULT_XY_LEGEND,
  ...DEFAULT_XY_HIDDEN_AXIS_TITLE,
};

export const diskIO = {
  xy: { dockerContainerDiskIOReadWrite },
};
