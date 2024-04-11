/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';

export const diskIORead: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskIORead', {
    defaultMessage: 'Disk Read IOPS',
  }),
  value: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const diskReadThroughput: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskReadThroughput', {
    defaultMessage: 'Disk Read Throughput',
  }),
  value: "counter_rate(max(system.diskio.read.bytes), kql='system.diskio.read.bytes: *')",
  format: 'bytes',
  decimals: 1,
  normalizeByUnit: 's',
};

export const diskSpaceAvailable: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskSpaceAvailable', {
    defaultMessage: 'Disk Space Available',
  }),
  value: 'average(system.filesystem.free)',
  format: 'bytes',
  decimals: 0,
};

export const diskSpaceAvailability: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskSpaceAvailability', {
    defaultMessage: 'Disk Space Availability',
  }),
  value: '1 - average(system.filesystem.used.pct)',
  format: 'percent',
  decimals: 0,
};

export const diskUsage: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskUsage', {
    defaultMessage: 'Disk Usage',
  }),
  value: 'max(system.filesystem.used.pct)',
  format: 'percent',
  decimals: 0,
};

export const diskUsageAverage: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskUsageAverage', {
    defaultMessage: 'Disk Usage Average',
  }),
  value: 'average(system.filesystem.used.pct)',
  format: 'percent',
  decimals: 0,
};

export const diskIOWrite: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskIOWrite', {
    defaultMessage: 'Disk Write IOPS',
  }),
  value: "counter_rate(max(system.diskio.write.count), kql='system.diskio.write.count: *')",
  format: 'number',
  decimals: 0,
  normalizeByUnit: 's',
};

export const diskWriteThroughput: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskWriteThroughput', {
    defaultMessage: 'Disk Write Throughput',
  }),
  value: "counter_rate(max(system.diskio.write.bytes), kql='system.diskio.write.bytes: *')",
  format: 'bytes',
  decimals: 1,
  normalizeByUnit: 's',
};
