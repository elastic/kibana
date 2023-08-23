/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { hostLensFormulas } from '../../../../constants';
import { XY_OVERRIDES } from '../../constants';
import type { XYConfig } from './types';

const TOP_VALUES_TYPE = 'top_values';

export const diskSpaceUsageAvailable: XYConfig = {
  id: 'diskSpaceUsageAvailable',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace', {
    defaultMessage: 'Disk Space',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.diskSpaceUsage,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace.label.used', {
            defaultMessage: 'Used',
          }),
        },
        {
          ...hostLensFormulas.diskSpaceAvailability,
          label: i18n.translate(
            'xpack.infra.assetDetails.metricsCharts.diskSpace.label.available',
            {
              defaultMessage: 'Available',
            }
          ),
        },
      ],
      options: {
        seriesType: 'area',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};

export const diskSpaceUsageByMountPoint: XYConfig = {
  id: 'DiskSpaceUsageByMountPoint',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpaceByMountingPoint', {
    defaultMessage: 'Disk Space by Mount Point',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.diskSpaceUsage,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskSpace.label.used', {
            defaultMessage: 'Used',
          }),
        },
      ],
      options: {
        seriesType: 'area',
        breakdown: {
          type: TOP_VALUES_TYPE,
          field: 'system.filesystem.mount_point',
          params: {
            size: 5,
          },
        },
      },
      type: 'visualization',
    },
  ],
  overrides: {
    axisLeft: XY_OVERRIDES.axisLeft,
  },
  dataViewOrigin: 'metrics',
};

export const diskThroughputReadWrite: XYConfig = {
  id: 'diskThroughputReadWrite',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskIOPS', {
    defaultMessage: 'Disk IOPS',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.diskIORead,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.read', {
            defaultMessage: 'Read',
          }),
        },
        {
          ...hostLensFormulas.diskIOWrite,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.write', {
            defaultMessage: 'Write',
          }),
        },
      ],
      options: {
        seriesType: 'area',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};

export const diskIOReadWrite: XYConfig = {
  id: 'diskIOReadWrite',
  title: i18n.translate('xpack.infra.assetDetails.metricsCharts.diskThroughput', {
    defaultMessage: 'Disk Throughput',
  }),
  layers: [
    {
      data: [
        {
          ...hostLensFormulas.diskReadThroughput,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.read', {
            defaultMessage: 'Read',
          }),
        },
        {
          ...hostLensFormulas.diskWriteThroughput,
          label: i18n.translate('xpack.infra.assetDetails.metricsCharts.metric.label.write', {
            defaultMessage: 'Write',
          }),
        },
      ],
      options: {
        seriesType: 'area',
      },
      type: 'visualization',
    },
  ],
  overrides: {
    settings: XY_OVERRIDES.settings,
  },
  dataViewOrigin: 'metrics',
};
