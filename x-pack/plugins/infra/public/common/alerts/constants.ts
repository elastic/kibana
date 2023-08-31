/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE, ALERT_STATUS_RECOVERED } from '@kbn/rule-data-utils';
import type { AlertStatusFilter } from './types';

export const ALERT_STATUS_ALL = 'all';

export const ALL_ALERTS: AlertStatusFilter = {
  status: ALERT_STATUS_ALL,
  label: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.showAll', {
    defaultMessage: 'Show all',
  }),
};

export const ACTIVE_ALERTS: AlertStatusFilter = {
  status: ALERT_STATUS_ACTIVE,
  query: {
    term: {
      [ALERT_STATUS]: {
        value: ALERT_STATUS_ACTIVE,
      },
    },
  },
  label: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.active', {
    defaultMessage: 'Active',
  }),
};

export const RECOVERED_ALERTS: AlertStatusFilter = {
  status: ALERT_STATUS_RECOVERED,
  query: {
    term: {
      [ALERT_STATUS]: {
        value: ALERT_STATUS_RECOVERED,
      },
    },
  },
  label: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.recovered', {
    defaultMessage: 'Recovered',
  }),
};

export const ALERT_STATUS_QUERY = {
  [ACTIVE_ALERTS.status]: ACTIVE_ALERTS.query,
  [RECOVERED_ALERTS.status]: RECOVERED_ALERTS.query,
};

export const ALERTS_DOC_HREF =
  'https://www.elastic.co/guide/en/observability/current/create-alerts.html';

export const ALERTS_PATH = '/app/observability/alerts';
