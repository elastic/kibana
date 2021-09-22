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
    endOfLog: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.endOfLog',
      {
        defaultMessage: 'Nothing more to show',
      }
    ),
    dateRangeMessage: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.logEntry.dateRangeMessage.title',
      {
        defaultMessage:
          'Nothing to show for selected date range, please select another and try again.',
      }
    ),
    emptyState: {
      title: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.emptyState.title',
        {
          defaultMessage: 'No logged actions',
        }
      ),
      body: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.emptyState.body',
        {
          defaultMessage: 'No actions have been logged for this endpoint.',
        }
      ),
    },
    action: {
      isolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.isolated',
        {
          defaultMessage: 'submitted request: Isolate host',
        }
      ),
      unisolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.unisolated',
        {
          defaultMessage: 'submitted request: Release host',
        }
      ),
    },
    response: {
      isolationSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationSuccessful',
        {
          defaultMessage: 'Host isolation request received by Endpoint',
        }
      ),
      isolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.isolationFailed',
        {
          defaultMessage: 'Host isolation request received by Endpoint with errors',
        }
      ),
      unisolationSuccessful: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationSuccessful',
        {
          defaultMessage: 'Release host request received by Endpoint',
        }
      ),
      unisolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationFailed',
        {
          defaultMessage: 'Release host request received by Endpoint with errors',
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
