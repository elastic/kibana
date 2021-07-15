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
  datePicker: {
    startDate: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.datePicker.startDate',
      {
        defaultMessage: 'Pick a start date',
      }
    ),
    endDate: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.datePicker.endDate',
      {
        defaultMessage: 'Pick an end date',
      }
    ),
  },
  LogEntry: {
    endOfLog: i18n.translate(
      'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.endOfLog',
      {
        defaultMessage: 'Nothing more to show',
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
          defaultMessage: 'isolated host',
        }
      ),
      unisolatedAction: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.action.unisolated',
        {
          defaultMessage: 'released host',
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
          defaultMessage: 'host release successful',
        }
      ),
      unisolationFailed: i18n.translate(
        'xpack.securitySolution.endpointDetails.activityLog.logEntry.response.unisolationFailed',
        {
          defaultMessage: 'host release failed',
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
