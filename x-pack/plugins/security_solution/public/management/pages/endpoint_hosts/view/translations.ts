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
    action: {
      isolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.isolated',
        {
          defaultMessage: 'isolated host',
        }
      ),
      unisolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.unisolated',
        {
          defaultMessage: 'unisolated host',
        }
      ),
    },
    response: {
      isolationSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationSuccessful',
        {
          defaultMessage: 'host isolation successful',
        }
      ),
      isolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationFailed',
        {
          defaultMessage: 'host isolation failed',
        }
      ),
      unisolationSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationSuccessful',
        {
          defaultMessage: 'host unisolation successful',
        }
      ),
      unisolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationFailed',
        {
          defaultMessage: 'host unisolation failed',
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
