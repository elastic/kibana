/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TABLE_COLUMN_LABEL = {
  alertsCount: i18n.translate('xpack.infra.hostsViewPage.table.alertsColumnHeader', {
    defaultMessage: 'Alerts',
  }),

  title: i18n.translate('xpack.infra.hostsViewPage.table.nameColumnHeader', {
    defaultMessage: 'Name',
  }),

  cpuUsage: i18n.translate('xpack.infra.hostsViewPage.table.cpuUsageColumnHeader', {
    defaultMessage: 'CPU usage (avg.)',
  }),

  diskSpaceUsage: i18n.translate('xpack.infra.hostsViewPage.table.diskUsageColumnHeader', {
    defaultMessage: 'Disk Usage (avg.)',
  }),

  tx: i18n.translate('xpack.infra.hostsViewPage.table.txColumnHeader', {
    defaultMessage: 'TX (avg.)',
  }),

  rx: i18n.translate('xpack.infra.hostsViewPage.table.rxColumnHeader', {
    defaultMessage: 'RX (avg.)',
  }),

  memoryFree: i18n.translate('xpack.infra.hostsViewPage.table.memoryFreeColumnHeader', {
    defaultMessage: 'Memory Free (avg.)',
  }),

  memoryUsage: i18n.translate('xpack.infra.hostsViewPage.table.memoryUsageColumnHeader', {
    defaultMessage: 'Memory Usage (avg.)',
  }),

  normalizedLoad1m: i18n.translate('xpack.infra.hostsViewPage.table.normalizedLoad1mColumnHeader', {
    defaultMessage: 'Normalized Load (avg.)',
  }),

  toggleDialogAction: i18n.translate('xpack.infra.hostsViewPage.table.toggleDialogWithDetails', {
    defaultMessage: 'Toggle dialog with details',
  }),
};

export const TABLE_CONTENT_LABEL = {
  activeAlerts: i18n.translate('xpack.infra.hostsViewPage.table.tooltip.activeAlertsExplanation', {
    defaultMessage: 'Active alerts',
  }),
};
