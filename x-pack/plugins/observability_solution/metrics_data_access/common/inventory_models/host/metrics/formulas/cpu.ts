/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import {
  CPU_USAGE_LABEL,
  LOAD_15M_LABEL,
  LOAD_1M_LABEL,
  LOAD_5M_LABEL,
  NORMALIZED_LOAD_LABEL,
} from '../../../shared/charts/constants';

export const cpuUsageIowait: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.iowaitLabel', {
    defaultMessage: 'iowait',
  }),
  value: 'average(system.cpu.iowait.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsageIrq: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.irqLabel', {
    defaultMessage: 'irq',
  }),
  value: 'average(system.cpu.irq.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsageNice: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.niceLabel', {
    defaultMessage: 'nice',
  }),
  value: 'average(system.cpu.nice.norm.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSoftirq: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.softirqLabel', {
    defaultMessage: 'softirq',
  }),
  value: 'average(system.cpu.softirq.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSteal: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.stealLabel', {
    defaultMessage: 'steal',
  }),
  value: 'average(system.cpu.steal.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSystem: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.systemLabel', {
    defaultMessage: 'system',
  }),
  value: 'average(system.cpu.system.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsageUser: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.userLabel', {
    defaultMessage: 'user',
  }),
  value: 'average(system.cpu.user.pct) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 1,
};

export const cpuUsage: LensBaseLayer = {
  label: CPU_USAGE_LABEL,
  value: '(average(system.cpu.user.pct) + average(system.cpu.system.pct)) / max(system.cpu.cores)',
  format: 'percent',
  decimals: 0,
};

export const load1m: LensBaseLayer = {
  label: LOAD_1M_LABEL,
  value: 'average(system.load.1)',
  format: 'number',
  decimals: 1,
};

export const load5m: LensBaseLayer = {
  label: LOAD_5M_LABEL,
  value: 'average(system.load.5)',
  format: 'number',
  decimals: 1,
};

export const load15m: LensBaseLayer = {
  label: LOAD_15M_LABEL,
  value: 'average(system.load.15)',
  format: 'number',
  decimals: 1,
};

export const normalizedLoad1m: LensBaseLayer = {
  label: NORMALIZED_LOAD_LABEL,
  value: 'average(system.load.1) / max(system.load.cores)',
  format: 'percent',
  decimals: 0,
};
