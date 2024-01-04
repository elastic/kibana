/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FormulaValueConfig } from '@kbn/lens-embeddable-utils/config_builder';

export const cpuUsageIowait: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.iowaitLabel', {
    defaultMessage: 'iowait',
  }),
  formula: 'average(system.cpu.iowait.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsageIrq: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.irqLabel', {
    defaultMessage: 'irq',
  }),
  formula: 'average(system.cpu.irq.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsageNice: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.niceLabel', {
    defaultMessage: 'nice',
  }),
  formula: 'average(system.cpu.nice.norm.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsageSoftirq: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.softirqLabel', {
    defaultMessage: 'softirq',
  }),
  formula: 'average(system.cpu.softirq.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsageSteal: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.stealLabel', {
    defaultMessage: 'steal',
  }),
  formula: 'average(system.cpu.steal.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsageSystem: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.systemLabel', {
    defaultMessage: 'system',
  }),
  formula: 'average(system.cpu.system.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsageUser: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.userLabel', {
    defaultMessage: 'user',
  }),
  formula: 'average(system.cpu.user.pct) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 1,
    },
  },
};

export const cpuUsage: FormulaValueConfig = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage', {
    defaultMessage: 'CPU Usage',
  }),
  formula:
    '(average(system.cpu.user.pct) + average(system.cpu.system.pct)) / max(system.cpu.cores)',
  format: {
    id: 'percent',
    params: {
      decimals: 0,
    },
  },
};
