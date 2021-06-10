/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const OVERVIEW = i18n.translate('xpack.securitySolution.endpointDetails.overview', {
  defaultMessage: 'Overview',
});

export const ACTIVITY_LOG = {
  tabTitle: i18n.translate('xpack.securitySolution.endpointDetails.activityLog', {
    defaultMessage: 'Activity Log',
  }),
  LogEntry: {
    host: i18n.translate('xpack.securitySolution.endpointDetails.activityLog.logEntry', {
      defaultMessage: 'host',
    }),
    action: {
      isolated: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.isolated',
        {
          defaultMessage: 'isolated',
        }
      ),
      unisolated: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.unisolated',
        {
          defaultMessage: 'unisolated',
        }
      ),
    },
    response: {
      isolation: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolation',
        {
          defaultMessage: 'isolation',
        }
      ),
      unisolation: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolation',
        {
          defaultMessage: 'unisolation',
        }
      ),
      successful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.successful.',
        {
          defaultMessage: 'successful',
        }
      ),
      failed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.failed',
        {
          defaultMessage: 'failed',
        }
      ),
    },
  },
};

export const SEARCH_ACTIVITY_LOG = i18n.translate(
  'xpack.securitySolution.endpointDetails.activityLog.search',
  {
    defaultMessage: 'Search activity log',
  }
);
