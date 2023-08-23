/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID, type ExperimentalFeatures } from '@kbn/security-solution-plugin/common';
import {
  type AppFeatureKey,
  type AppFeatureKeys,
  type AppFeatureKibanaConfig,
  AppFeatureSecurityKey,
  type AppFeaturesSecurityConfig,
  SecuritySubFeatureId,
} from '@kbn/security-solution-features';

export const getSecurityAppFeaturesConfigurator =
  (enabledAppFeatureKeys: AppFeatureKeys) =>
  (
    _: ExperimentalFeatures // currently un-used, but left here as a convenience for possible future use
  ): AppFeaturesSecurityConfig => {
    const securityAppFeatureValues: AppFeatureKey[] = Object.values(AppFeatureSecurityKey);
    const securityEnabledAppFeatureKeys = enabledAppFeatureKeys.filter((appFeatureKey) =>
      securityAppFeatureValues.includes(appFeatureKey)
    ) as AppFeatureSecurityKey[];

    return new Map(
      securityEnabledAppFeatureKeys.map((key) => [key, securityAppFeaturesConfig[key]])
    );
  };

/**
 * Maps the AppFeatures keys to Kibana privileges that will be merged
 * into the base privileges config for the Security app.
 *
 * Privileges can be added in different ways:
 * - `privileges`: the privileges that will be added directly into the main Security feature.
 * - `subFeatureIds`: the ids of the sub-features that will be added into the Security subFeatures entry.
 * - `subFeaturesPrivileges`: the privileges that will be added into the existing Security subFeature with the privilege `id` specified.
 */
const securityAppFeaturesConfig: Record<
  AppFeatureSecurityKey,
  AppFeatureKibanaConfig<SecuritySubFeatureId>
> = {
  [AppFeatureSecurityKey.advancedInsights]: {
    privileges: {
      all: {
        ui: ['entity-analytics'],
        api: [`${APP_ID}-entity-analytics`],
      },
      read: {
        ui: ['entity-analytics'],
        api: [`${APP_ID}-entity-analytics`],
      },
    },
  },
  [AppFeatureSecurityKey.investigationGuide]: {
    privileges: {
      all: {
        ui: ['investigation-guide'],
      },
      read: {
        ui: ['investigation-guide'],
      },
    },
  },

  [AppFeatureSecurityKey.threatIntelligence]: {
    privileges: {
      all: {
        ui: ['threat-intelligence'],
        api: [`${APP_ID}-threat-intelligence`],
      },
      read: {
        ui: ['threat-intelligence'],
        api: [`${APP_ID}-threat-intelligence`],
      },
    },
  },

  [AppFeatureSecurityKey.endpointHostManagement]: {
    subFeatureIds: [SecuritySubFeatureId.endpointList],
  },

  [AppFeatureSecurityKey.endpointExceptions]: {
    subFeatureIds: [SecuritySubFeatureId.endpointExceptions],
  },

  [AppFeatureSecurityKey.endpointPolicyManagement]: {
    subFeatureIds: [SecuritySubFeatureId.policyManagement],
  },

  // Adds no additional kibana feature controls
  [AppFeatureSecurityKey.endpointPolicyProtections]: {},

  [AppFeatureSecurityKey.endpointArtifactManagement]: {
    subFeatureIds: [
      SecuritySubFeatureId.trustedApplications,
      SecuritySubFeatureId.blocklist,
      SecuritySubFeatureId.eventFilters,
    ],
    subFeaturesPrivileges: [
      {
        id: 'host_isolation_exceptions_all',
        api: [`${APP_ID}-accessHostIsolationExceptions`, `${APP_ID}-writeHostIsolationExceptions`],
        ui: ['accessHostIsolationExceptions', 'writeHostIsolationExceptions'],
      },
      {
        id: 'host_isolation_exceptions_read',
        api: [`${APP_ID}-accessHostIsolationExceptions`],
        ui: ['accessHostIsolationExceptions'],
      },
    ],
  },

  [AppFeatureSecurityKey.endpointResponseActions]: {
    subFeatureIds: [
      SecuritySubFeatureId.hostIsolationExceptions,
      SecuritySubFeatureId.responseActionsHistory,
      SecuritySubFeatureId.hostIsolation,
      SecuritySubFeatureId.processOperations,
      SecuritySubFeatureId.fileOperations,
      SecuritySubFeatureId.executeAction,
    ],
    subFeaturesPrivileges: [
      {
        id: 'host_isolation_all',
        api: [`${APP_ID}-writeHostIsolation`],
        ui: ['writeHostIsolation'],
      },
    ],
  },

  [AppFeatureSecurityKey.osqueryAutomatedResponseActions]: {},
};
