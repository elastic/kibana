/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_STATUS_RECOVERED,
  ALERT_STATUS_UNTRACKED,
} from '@kbn/rule-data-utils';
import type { Filter } from '@kbn/es-query';
import type { AlertStatus } from '@kbn/observability-plugin/common/typings';
import { INFRA_ALERT_FEATURE_IDS } from '../../../../common/constants';

export const ALERT_STATUS_ALL = 'all';

interface AlertStatusFilter {
  status: AlertStatus;
  query?: Filter['query'];
  label: string;
}

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

export const UNTRACKED_ALERTS: AlertStatusFilter = {
  status: ALERT_STATUS_UNTRACKED,
  query: {
    term: {
      [ALERT_STATUS]: {
        value: ALERT_STATUS_UNTRACKED,
      },
    },
  },
  label: i18n.translate('xpack.infra.hostsViewPage.tabs.alerts.alertStatusFilter.untracked', {
    defaultMessage: 'Untracked',
  }),
};

export const ALERT_STATUS_QUERY = {
  [ACTIVE_ALERTS.status]: ACTIVE_ALERTS.query,
  [RECOVERED_ALERTS.status]: RECOVERED_ALERTS.query,
  [UNTRACKED_ALERTS.status]: UNTRACKED_ALERTS.query,
};

export const ALERTS_DOC_HREF =
  'https://www.elastic.co/guide/en/observability/current/create-alerts.html';

export const ALERTS_PATH = '/app/observability/alerts';

export const ALERTS_PER_PAGE = 10;
export const ALERTS_TABLE_ID = 'xpack.infra.hosts.alerts.table';

export const infraAlertFeatureIds = INFRA_ALERT_FEATURE_IDS;
