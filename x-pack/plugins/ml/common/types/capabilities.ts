/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaRequest } from 'kibana/server';
import { PLUGIN_ID } from '../constants/app';

export const apmUserMlCapabilities = {
  canGetJobs: false,
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
};

export const adminMlCapabilities = {
  // Anomaly Detection
  canCreateJob: false,
  canDeleteJob: false,
  canOpenJob: false,
  canCloseJob: false,
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
  // TODO: include ML in base privileges for the `8.0` release: https://github.com/elastic/kibana/issues/71422
  const savedObjects = ['index-pattern', 'dashboard', 'search', 'visualization'];
  const privilege = {
    app: [PLUGIN_ID, 'kibana'],
    excludeFromBasePrivileges: true,
    management: {
      insightsAndAlerting: ['jobsListLink'],
    },
    catalogue: [PLUGIN_ID],
  };

  return {
    admin: {
      ...privilege,
      api: allMlCapabilitiesKeys.map((k) => `ml:${k}`),
      catalogue: [PLUGIN_ID, `${PLUGIN_ID}_file_data_visualizer`],
      ui: allMlCapabilitiesKeys,
      savedObject: {
        all: savedObjects,
        read: savedObjects,
      },
    },
    user: {
      ...privilege,
      api: userMlCapabilitiesKeys.map((k) => `ml:${k}`),
      catalogue: [PLUGIN_ID],
      ui: userMlCapabilitiesKeys,
      savedObject: {
        all: [],
        read: savedObjects,
      },
    },
    apmUser: {
      excludeFromBasePrivileges: true,
      app: [],
      catalogue: [],
      savedObject: {
        all: [],
        read: [],
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
