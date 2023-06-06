/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { EXCEPTION_LIST_NAMESPACE_AGNOSTIC } from '@kbn/securitysolution-list-constants';
import {
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
} from '@kbn/securitysolution-rules';
import { APP_ID, LEGACY_NOTIFICATIONS_ID, SERVER_APP_ID } from '../../../common/constants';
import { savedObjectTypes } from '../../saved_objects';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { SecuritySubFeatureId } from './security_kibana_sub_features';
import type { AppFeaturesSecurityConfig, BaseKibanaFeatureConfig } from './types';
import { AppFeatureSecurityKey } from '../../../common/types/app_features';

// Same as the plugin id defined by Cloud Security Posture
const CLOUD_POSTURE_APP_ID = 'csp';
// Same as the saved-object type for rules defined by Cloud Security Posture
const CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE = 'csp_rule';

const SECURITY_RULE_TYPES = [
  LEGACY_NOTIFICATIONS_ID,
  EQL_RULE_TYPE_ID,
  INDICATOR_RULE_TYPE_ID,
  ML_RULE_TYPE_ID,
  QUERY_RULE_TYPE_ID,
  SAVED_QUERY_RULE_TYPE_ID,
  THRESHOLD_RULE_TYPE_ID,
  NEW_TERMS_RULE_TYPE_ID,
];

export const getSecurityBaseKibanaFeature = (): BaseKibanaFeatureConfig => ({
  id: SERVER_APP_ID,
  name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionTitle', {
    defaultMessage: 'Security',
  }),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
  catalogue: [APP_ID],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: SECURITY_RULE_TYPES,
  privileges: {
    all: {
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [
        APP_ID,
        'lists-all',
        'lists-read',
        'lists-summary',
        'rac',
        'cloud-security-posture-all',
        'cloud-security-posture-read',
      ],
      savedObject: {
        all: [
          'alert',
          'exception-list',
          EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          DATA_VIEW_SAVED_OBJECT_TYPE,
          ...savedObjectTypes,
          CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
        ],
        read: [],
      },
      alerting: {
        rule: {
          all: SECURITY_RULE_TYPES,
        },
        alert: {
          all: SECURITY_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'crud'],
    },
    read: {
      app: [APP_ID, CLOUD_POSTURE_APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'lists-read', 'rac', 'cloud-security-posture-read'],
      savedObject: {
        all: [],
        read: [
          'exception-list',
          EXCEPTION_LIST_NAMESPACE_AGNOSTIC,
          DATA_VIEW_SAVED_OBJECT_TYPE,
          ...savedObjectTypes,
          CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE,
        ],
      },
      alerting: {
        rule: {
          read: SECURITY_RULE_TYPES,
        },
        alert: {
          all: SECURITY_RULE_TYPES,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
  },
});

export const getSecurityBaseKibanaSubFeatureIds = (
  experimentalFeatures: ExperimentalFeatures
): SecuritySubFeatureId[] => {
  const subFeatureIds: SecuritySubFeatureId[] = [];

  if (experimentalFeatures.endpointRbacEnabled) {
    subFeatureIds.push(
      SecuritySubFeatureId.endpointList,
      SecuritySubFeatureId.trustedApplications,
      SecuritySubFeatureId.hostIsolationExceptions,
      SecuritySubFeatureId.blocklist,
      SecuritySubFeatureId.eventFilters,
      SecuritySubFeatureId.policyManagement
    );
  }

  if (experimentalFeatures.endpointRbacEnabled || experimentalFeatures.endpointRbacV1Enabled) {
    subFeatureIds.push(
      SecuritySubFeatureId.responseActionsHistory,
      SecuritySubFeatureId.hostIsolation,
      SecuritySubFeatureId.processOperations
    );
  }
  if (experimentalFeatures.responseActionGetFileEnabled) {
    subFeatureIds.push(SecuritySubFeatureId.fileOperations);
  }
  // planned for 8.8
  if (experimentalFeatures.responseActionExecuteEnabled) {
    subFeatureIds.push(SecuritySubFeatureId.executeAction);
  }

  return subFeatureIds;
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
export const getSecurityAppFeaturesConfig = (): AppFeaturesSecurityConfig => {
  return {
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
  };
};
