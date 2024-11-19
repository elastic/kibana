/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const NOT_AVAILABLE_LABEL = i18n.translate('xpack.infra.assetDetails.notApplicableLabel', {
  defaultMessage: 'N/A',
});

export const HOST_METRIC_GROUP_TITLES = {
  cpu: i18n.translate('xpack.infra.metricsGroup.cpu', {
    defaultMessage: 'CPU',
  }),
  memory: i18n.translate('xpack.infra.metricsGroup.memory', {
    defaultMessage: 'Memory',
  }),
  network: i18n.translate('xpack.infra.metricsGroup.network', {
    defaultMessage: 'Network',
  }),
  disk: i18n.translate('xpack.infra.metricsGroup.disk', {
    defaultMessage: 'Disk',
  }),
  log: i18n.translate('xpack.infra.metricsGroup.log', {
    defaultMessage: 'Log Rate',
  }),
  kubernetes: i18n.translate('xpack.infra.metricsGroup.kubernetes', {
    defaultMessage: 'Kubernetes',
  }),
};

export const CONTAINER_METRIC_GROUP_TITLES = {
  cpu: i18n.translate('xpack.infra.metricsGroup.containerCpu', {
    defaultMessage: 'CPU',
  }),
  memory: i18n.translate('xpack.infra.metricsGroup.containerMemory', {
    defaultMessage: 'Memory',
  }),
  network: i18n.translate('xpack.infra.metricsGroup.containerNetwork', {
    defaultMessage: 'Network',
  }),
  disk: i18n.translate('xpack.infra.metricsGroup.containerDisk', {
    defaultMessage: 'Disk',
  }),
};
