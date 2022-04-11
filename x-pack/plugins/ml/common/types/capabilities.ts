/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { KibanaRequest } from 'kibana/server';
import { PLUGIN_ID } from '../constants/app';
import {
  ML_JOB_SAVED_OBJECT_TYPE,
  ML_MODULE_SAVED_OBJECT_TYPE,
  ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
} from './saved_objects';
import { ML_ALERT_TYPES } from '../constants/alerts';

export const apmUserMlCapabilities = {
  canGetJobs: false,
  canAccessML: false,
};

export const userMlCapabilities = {
  canAccessML: false,
  // Anomaly Detection
  canGetJobs: false,
  canGetDatafeeds: false,
  // Calendars
  canGetCalendars: false,
  // File Data Visualizer
  canFindFileStructure: false,
  // Data Frame Analytics
  canGetDataFrameAnalytics: false,
  // Annotations
  canGetAnnotations: false,
  canCreateAnnotation: false,
  canDeleteAnnotation: false,
  // Alerts
  canUseMlAlerts: false,
  // Trained models
  canGetTrainedModels: false,
};

export const adminMlCapabilities = {
  // Anomaly Detection
  canCreateJob: false,
  canDeleteJob: false,
  canOpenJob: false,
  canCloseJob: false,
  canResetJob: false,
  canUpdateJob: false,
  canForecastJob: false,
  canCreateDatafeed: false,
  canDeleteDatafeed: false,
  canStartStopDatafeed: false,
  canUpdateDatafeed: false,
  canPreviewDatafeed: false,
  // Filters
  canGetFilters: false,
  // Calendars
  canCreateCalendar: false,
  canDeleteCalendar: false,
  // Filters
  canCreateFilter: false,
  canDeleteFilter: false,
  // Data Frame Analytics
  canCreateDataFrameAnalytics: false,
  canDeleteDataFrameAnalytics: false,
  canStartStopDataFrameAnalytics: false,
  // Alerts
  canCreateMlAlerts: false,
  canUseMlAlerts: false,
  // Model management
  canViewMlNodes: false,
  // Trained models
  canCreateTrainedModels: false,
  canDeleteTrainedModels: false,
  canStartStopTrainedModels: false,
};

export type UserMlCapabilities = typeof userMlCapabilities;
export type AdminMlCapabilities = typeof adminMlCapabilities;
export type MlCapabilities = UserMlCapabilities & AdminMlCapabilities;
export type MlCapabilitiesKey = keyof MlCapabilities;

export const basicLicenseMlCapabilities = ['canAccessML', 'canFindFileStructure'] as Array<
  keyof MlCapabilities
>;

export function getDefaultCapabilities(): MlCapabilities {
  return {
    ...userMlCapabilities,
    ...adminMlCapabilities,
  };
}

export function getPluginPrivileges() {
  const apmUserMlCapabilitiesKeys = Object.keys(apmUserMlCapabilities);
  const userMlCapabilitiesKeys = Object.keys(userMlCapabilities);
  const adminMlCapabilitiesKeys = Object.keys(adminMlCapabilities);
  const allMlCapabilitiesKeys = [...adminMlCapabilitiesKeys, ...userMlCapabilitiesKeys];

  const savedObjects = [
    'index-pattern',
    'dashboard',
    'search',
    'visualization',
    ML_JOB_SAVED_OBJECT_TYPE,
    ML_MODULE_SAVED_OBJECT_TYPE,
    ML_TRAINED_MODEL_SAVED_OBJECT_TYPE,
  ];
  const privilege = {
    app: [PLUGIN_ID, 'kibana'],
    excludeFromBasePrivileges: false,
    management: {
      insightsAndAlerting: ['jobsListLink'],
    },
    catalogue: [PLUGIN_ID],
  };

  return {
    admin: {
      ...privilege,
      api: ['fileUpload:analyzeFile', ...allMlCapabilitiesKeys.map((k) => `ml:${k}`)],
      catalogue: [PLUGIN_ID, `${PLUGIN_ID}_file_data_visualizer`],
      ui: allMlCapabilitiesKeys,
      savedObject: {
        all: savedObjects,
        read: savedObjects,
      },
      alerting: {
        rule: {
          all: Object.values(ML_ALERT_TYPES),
        },
        alert: {
          all: Object.values(ML_ALERT_TYPES),
        },
      },
    },
    user: {
      ...privilege,
      api: ['fileUpload:analyzeFile', ...userMlCapabilitiesKeys.map((k) => `ml:${k}`)],
      catalogue: [PLUGIN_ID],
      management: { insightsAndAlerting: [] },
      ui: userMlCapabilitiesKeys,
      savedObject: {
        all: [],
        read: savedObjects,
      },
      alerting: {
        rule: {
          read: Object.values(ML_ALERT_TYPES),
        },
        alert: {
          read: Object.values(ML_ALERT_TYPES),
        },
      },
    },
    apmUser: {
      excludeFromBasePrivileges: true,
      app: [],
      catalogue: [],
      savedObject: {
        all: [],
        read: [ML_JOB_SAVED_OBJECT_TYPE],
      },
      api: apmUserMlCapabilitiesKeys.map((k) => `ml:${k}`),
      ui: apmUserMlCapabilitiesKeys,
    },
  };
}

export interface MlCapabilitiesResponse {
  capabilities: MlCapabilities;
  upgradeInProgress: boolean;
  isPlatinumOrTrialLicense: boolean;
  mlFeatureEnabledInSpace: boolean;
}

export type ResolveMlCapabilities = (request: KibanaRequest) => Promise<MlCapabilities | null>;
