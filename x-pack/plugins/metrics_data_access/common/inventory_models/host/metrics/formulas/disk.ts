/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils/config_builder';

export const diskIORead: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskIORead', {
    defaultMessage: 'Disk Read IOPS',
  }),
  formula: "counter_rate(max(system.diskio.read.count), kql='system.diskio.read.count: *')",
  timeScale: 's',
};

export const diskReadThroughput: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskReadThroughput', {
    defaultMessage: 'Disk Read Throughput',
  }),
  formula: "counter_rate(max(system.diskio.read.bytes), kql='system.diskio.read.bytes: *')",
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
  timeScale: 's',
};

export const diskSpaceAvailable: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskSpaceAvailable', {
    defaultMessage: 'Disk Space Available',
  }),
  formula: 'average(system.filesystem.free)',
  format: {
    id: 'bytes',
  },
};

export const diskSpaceAvailability: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskSpaceAvailability', {
    defaultMessage: 'Disk Space Availability',
  }),
  formula: '1 - average(system.filesystem.used.pct)',
  format: {
    id: 'percent',
  },
};

export const diskUsage: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskUsage', {
    defaultMessage: 'Disk Usage',
  }),
  formula: 'average(system.filesystem.used.pct)',
  format: {
    id: 'percent',
  },
};

export const diskIOWrite: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskIOWrite', {
    defaultMessage: 'Disk Write IOPS',
  }),
  formula: "counter_rate(max(system.diskio.write.count), kql='system.diskio.write.count: *')",
  timeScale: 's',
};

export const diskWriteThroughput: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.diskWriteThroughput', {
    defaultMessage: 'Disk Write Throughput',
  }),
  formula: "counter_rate(max(system.diskio.write.bytes), kql='system.diskio.write.bytes: *')",
  format: {
    id: 'bytes',
    params: {
      decimals: 1,
    },
  },
  timeScale: 's',
};
