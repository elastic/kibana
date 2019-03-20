/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const NETWORK_EVENTS = i18n.translate('xpack.secops.kpiNetwork.source.networkEventsTitle', {
  defaultMessage: 'Network Events',
});

export const UNIQUE_ID = i18n.translate('xpack.secops.kpiNetwork.source.uniquiIdTitle', {
  defaultMessage: 'Unique Flow ID',
});

export const ACTIVE_AGENTS = i18n.translate('xpack.secops.kpiNetwork.source.activeAgentsTitle', {
  defaultMessage: 'Active Agents',
});

export const UNIQUE_PRIVATE_IP = i18n.translate(
  'xpack.secops.kpiNetwork.source.uniquePrivateIpsTitle',
  {
    defaultMessage: 'Unique Private IP',
  }
);

export const LOADING = i18n.translate('xpack.secops.kpiNetwork.source.loadingDescription', {
  defaultMessage: 'Loading',
});
