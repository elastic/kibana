/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensXYConfigBase } from '@kbn/lens-embeddable-utils/config_builder';

export const DEFAULT_XY_FITTING_FUNCTION: Pick<LensXYConfigBase, 'fittingFunction'> = {
  fittingFunction: 'Linear',
};

export const DEFAULT_XY_HIDDEN_LEGEND: Pick<LensXYConfigBase, 'legend'> = {
  legend: {
    show: false,
  },
};

export const DEFAULT_XY_LEGEND: Pick<LensXYConfigBase, 'legend'> = {
  legend: {
    position: 'bottom',
    show: true,
  },
};

export const DEFAULT_XY_YBOUNDS: Pick<LensXYConfigBase, 'yBounds'> = {
  yBounds: {
    mode: 'custom',
    lowerBound: 0,
    upperBound: 1,
  },
};

export const DEFAULT_XY_HIDDEN_AXIS_TITLE: Pick<LensXYConfigBase, 'axisTitleVisibility'> = {
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: false,
  },
};

export const CPU_USAGE_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.cpuUsage',
  {
    defaultMessage: 'CPU Usage',
  }
);

export const MEMORY_USAGE_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.memoryUsage',
  {
    defaultMessage: 'Memory Usage',
  }
);

export const MEMORY_FREE_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.memoryFree',
  {
    defaultMessage: 'Memory Free',
  }
);

export const LOAD_LABEL = i18n.translate('xpack.metricsData.assetDetails.metrics.label.load', {
  defaultMessage: 'Load',
});

export const LOAD_1M_LABEL = i18n.translate('xpack.metricsData.assetDetails.metrics.label.load1m', {
  defaultMessage: 'Load (1m)',
});

export const LOAD_5M_LABEL = i18n.translate('xpack.metricsData.assetDetails.metrics.label.load5m', {
  defaultMessage: 'Load (5m)',
});

export const LOAD_15M_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.load15m',
  {
    defaultMessage: 'Load (15m)',
  }
);

export const NORMALIZED_LOAD_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.normalizedLoad',
  {
    defaultMessage: 'Normalized Load',
  }
);

export const DISK_USAGE_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskUsage',
  {
    defaultMessage: 'Disk Usage',
  }
);

export const DISK_IOPS_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskIOPS',
  {
    defaultMessage: 'Disk IOPS',
  }
);

export const DISK_READ_IOPS_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskReadIOPS',
  {
    defaultMessage: 'Disk Read IOPS',
  }
);

export const DISK_WRITE_IOPS_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskWriteIOPS',
  {
    defaultMessage: 'Disk Write IOPS',
  }
);

export const DISK_USAGE_BY_MOUNTING_POINT_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskUsageByMountingPoint',
  {
    defaultMessage: 'Disk Usage by Mounting Point',
  }
);

export const DISK_THROUGHPUT_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskThroughput',
  {
    defaultMessage: 'Disk Throughput',
  }
);

export const DISK_READ_THROUGHPUT_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskReadThroughput',
  {
    defaultMessage: 'Disk Read Throughput',
  }
);

export const DISK_WRITE_THROUGHPUT_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskWriteThroughput',
  {
    defaultMessage: 'Disk Write Throughput',
  }
);

export const DISK_SPACE_AVAILABLE_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskSpaceAvailable',
  {
    defaultMessage: 'Disk Space Available',
  }
);

export const DISK_SPACE_AVAILABILITY_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.diskSpaceAvailable',
  {
    defaultMessage: 'Disk Space Availability',
  }
);

export const NETWORK_LABEL = i18n.translate(
  'xpack.metricsData.assetDetails.metrics.label.network',
  {
    defaultMessage: 'Network',
  }
);
