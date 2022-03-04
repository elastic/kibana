/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const JOB_CREATED_SUCCESS_TITLE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedNotificationTitle',
  {
    defaultMessage: 'Job successfully created',
  }
);

export const JOB_CREATED_SUCCESS_MESSAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedNotificationText',
  {
    defaultMessage:
      'The analysis is now running for response duration chart. It might take a while before results are added to the response times graph.',
  }
);

export const JOB_CREATED_LAZY_SUCCESS_MESSAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedLazyNotificationText',
  {
    defaultMessage:
      'The analysis is waiting for an ML node to become available. It might take a while before results are added to the response times graph.',
  }
);

export const JOB_CREATION_FAILED = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreationFailedNotificationTitle',
  {
    defaultMessage: 'Job creation failed',
  }
);

export const JOB_CREATION_FAILED_MESSAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreationFailedNotificationText',
  {
    defaultMessage:
      'Your current license may not allow for creating machine learning jobs, or this job may already exist.',
  }
);

export const JOB_DELETION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobDeletionNotificationTitle',
  {
    defaultMessage: 'Job deleted',
  }
);

export const JOB_DELETION_SUCCESS = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobDeletionSuccessNotificationText',
  {
    defaultMessage: 'Job is successfully deleted',
  }
);

export const JOB_DELETION_CONFIRMATION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobDeletionConfirmLabel',
  {
    defaultMessage: 'Delete anomaly detection job?',
  }
);

export const VIEW_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.jobCreatedNotificationText.viewJobLinkText',
  {
    defaultMessage: 'View job',
  }
);

export const EXPLORE_IN_ML_APP = i18n.translate('xpack.uptime.ml.durationChart.exploreInMlApp', {
  defaultMessage: 'Explore in ML App',
});

export const ENABLE_ANOMALY_DETECTION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.enableAnomalyDetectionTitle',
  {
    defaultMessage: 'Enable anomaly detection',
  }
);

export const ANOMALY_DETECTION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.anomalyDetectionTitle',
  {
    defaultMessage: 'Anomaly detection',
  }
);

export const DISABLE_ANOMALY_DETECTION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.disableAnomalyDetectionTitle',
  {
    defaultMessage: 'Disable anomaly detection',
  }
);

export const ENABLE_ANOMALY_ALERT = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.enableAnomalyAlert',
  {
    defaultMessage: 'Enable anomaly alert',
  }
);

export const ENABLE_ANOMALY_NO_PERMISSIONS_TOOLTIP = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.noPermissionsTooltip',
  {
    defaultMessage: 'You need read-write access to Uptime to create anomaly alerts.',
  }
);

export const DISABLE_ANOMALY_ALERT = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.disableAnomalyAlert',
  {
    defaultMessage: 'Disable anomaly alert',
  }
);

export const MANAGE_ANOMALY_DETECTION = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.manageAnomalyDetectionTitle',
  {
    defaultMessage: 'Manage anomaly detection',
  }
);

export const ML_MANAGEMENT_PAGE = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.manageMLJobDescription.mlJobsPageLinkText',
  {
    defaultMessage: 'Machine Learning jobs management page',
  }
);

export const TAKE_SOME_TIME_TEXT = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.manageMLJobDescription.noteText',
  {
    defaultMessage: 'Note: It might take a few minutes for the job to begin calculating results.',
  }
);

export const CREATE_NEW_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.createNewJobButtonLabel',
  {
    defaultMessage: 'Create new job',
  }
);

export const CANCEL_LABEL = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.cancelLabel',
  {
    defaultMessage: 'Cancel',
  }
);

export const CREAT_ML_JOB_DESC = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.createMLJobDescription',
  {
    defaultMessage: `Here you can create a machine learning job to calculate anomaly scores on
    response durations for Uptime Monitor. Once enabled, the monitor duration chart on the details page
    will show the expected bounds and annotate the graph with anomalies. You can also potentially
     identify periods of increased latency across geographical regions.`,
  }
);

export const START_TRAIL = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.startTrial',
  {
    defaultMessage: 'Start free 14-day trial',
  }
);

export const START_TRAIL_DESC = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.startTrialDesc',
  {
    defaultMessage:
      'In order to access duration anomaly detection, you have to be subscribed to an Elastic Platinum license.',
  }
);

export const ENABLE_MANAGE_JOB = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.enable_or_manage_job',
  {
    defaultMessage:
      'You can enable anomaly detection job or if job is already there you can manage the job or alert.',
  }
);

export const ADD_JOB_PERMISSIONS_NEEDED = i18n.translate(
  'xpack.uptime.ml.enableAnomalyDetectionPanel.add_job_permissions_needed',
  {
    defaultMessage: 'Permissions needed',
  }
);
