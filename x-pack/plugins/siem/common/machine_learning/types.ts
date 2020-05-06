/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface MlCapabilities {
  capabilities: {
    canGetJobs: boolean;
    canCreateJob: boolean;
    canDeleteJob: boolean;
    canOpenJob: boolean;
    canCloseJob: boolean;
    canForecastJob: boolean;
    canGetDatafeeds: boolean;
    canStartStopDatafeed: boolean;
    canUpdateJob: boolean;
    canUpdateDatafeed: boolean;
    canPreviewDatafeed: boolean;
    canGetCalendars: boolean;
    canCreateCalendar: boolean;
    canDeleteCalendar: boolean;
    canGetFilters: boolean;
    canCreateFilter: boolean;
    canDeleteFilter: boolean;
    canFindFileStructure: boolean;
    canGetDataFrame: boolean;
    canDeleteDataFrame: boolean;
    canPreviewDataFrame: boolean;
    canCreateDataFrame: boolean;
    canStartStopDataFrame: boolean;
    canGetDataFrameAnalytics: boolean;
    canDeleteDataFrameAnalytics: boolean;
    canCreateDataFrameAnalytics: boolean;
    canStartStopDataFrameAnalytics: boolean;
  };
  isPlatinumOrTrialLicense: boolean;
  mlFeatureEnabledInSpace: boolean;
  upgradeInProgress: boolean;
}
