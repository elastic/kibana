/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MlCapabilitiesResponse } from '../../../ml/common/types/capabilities';

export const emptyMlCapabilities: MlCapabilitiesResponse = {
  capabilities: {
    canAccessML: false,
    canGetAnnotations: false,
    canCreateAnnotation: false,
    canDeleteAnnotation: false,
    canGetJobs: false,
    canCreateJob: false,
    canDeleteJob: false,
    canOpenJob: false,
    canCloseJob: false,
    canForecastJob: false,
    canGetDatafeeds: false,
    canStartStopDatafeed: false,
    canUpdateJob: false,
    canUpdateDatafeed: false,
    canPreviewDatafeed: false,
    canGetCalendars: false,
    canCreateCalendar: false,
    canDeleteCalendar: false,
    canGetFilters: false,
    canCreateFilter: false,
    canDeleteFilter: false,
    canFindFileStructure: false,
    canCreateDatafeed: false,
    canDeleteDatafeed: false,
    canGetDataFrameAnalytics: false,
    canDeleteDataFrameAnalytics: false,
    canCreateDataFrameAnalytics: false,
    canStartStopDataFrameAnalytics: false,
  },
  isPlatinumOrTrialLicense: false,
  mlFeatureEnabledInSpace: false,
  upgradeInProgress: false,
};
