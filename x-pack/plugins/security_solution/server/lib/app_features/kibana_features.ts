/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import {
  createUICapabilities as createCasesUICapabilities,
  getApiTags as getCasesApiTags,
} from '@kbn/cases-plugin/common';

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
import {
  APP_ID,
  CASES_FEATURE_ID,
  LEGACY_NOTIFICATIONS_ID,
  SERVER_APP_ID,
} from '../../../common/constants';
import { savedObjectTypes } from '../../saved_objects';
import type { ExperimentalFeatures } from '../../../common/experimental_features';
import { getSubFeatures } from './kibana_sub_features';

// Same as the plugin id defined by Cloud Security Posture
const CLOUD_POSTURE_APP_ID = 'csp';
// Same as the saved-object type for rules defined by Cloud Security Posture
const CLOUD_POSTURE_SAVED_OBJECT_RULE_TYPE = 'csp_rule';

export const SECURITY_SOLUTION_FEATURE_ID = SERVER_APP_ID;
export { CASES_FEATURE_ID };

export const getSecuritySolutionKibanaFeature = (
  experimentalFeatures: ExperimentalFeatures
): KibanaFeatureConfig => {
  const ruleTypes = [
    LEGACY_NOTIFICATIONS_ID,
    EQL_RULE_TYPE_ID,
    INDICATOR_RULE_TYPE_ID,
    ML_RULE_TYPE_ID,
    QUERY_RULE_TYPE_ID,
    SAVED_QUERY_RULE_TYPE_ID,
    THRESHOLD_RULE_TYPE_ID,
    NEW_TERMS_RULE_TYPE_ID,
  ];
  return {
    id: SECURITY_SOLUTION_FEATURE_ID,
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
    alerting: ruleTypes,
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
          'load-prebuilt-rules',
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
            all: ruleTypes,
          },
          alert: {
            all: ruleTypes,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['show', 'crud', 'prebuilt-rules'],
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
            read: ruleTypes,
          },
          alert: {
            all: ruleTypes,
          },
        },
        management: {
          insightsAndAlerting: ['triggersActions'],
        },
        ui: ['show'],
      },
    },
    subFeatures: getSubFeatures(experimentalFeatures),
  };
};

export const getCasesKibanaFeature = (): KibanaFeatureConfig => {
  const casesCapabilities = createCasesUICapabilities();
  const casesApiTags = getCasesApiTags(APP_ID);

  return {
    id: CASES_FEATURE_ID,
    name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionCaseTitle', {
      defaultMessage: 'Cases',
    }),
    order: 1100,
    category: DEFAULT_APP_CATEGORIES.security,
    app: [CASES_FEATURE_ID, 'kibana'],
    catalogue: [APP_ID],
    cases: [APP_ID],
    privileges: {
      all: {
        api: casesApiTags.all,
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          create: [APP_ID],
          read: [APP_ID],
          update: [APP_ID],
          push: [APP_ID],
        },
        savedObject: {
          all: [...filesSavedObjectTypes],
          read: [...filesSavedObjectTypes],
        },
        ui: casesCapabilities.all,
      },
      read: {
        api: casesApiTags.read,
        app: [CASES_FEATURE_ID, 'kibana'],
        catalogue: [APP_ID],
        cases: {
          read: [APP_ID],
        },
        savedObject: {
          all: [],
          read: [...filesSavedObjectTypes],
        },
        ui: casesCapabilities.read,
      },
    },
    subFeatures: [
      {
        name: i18n.translate('xpack.securitySolution.featureRegistry.deleteSubFeatureName', {
          defaultMessage: 'Delete',
        }),
        privilegeGroups: [
          {
            groupType: 'independent',
            privileges: [
              {
                api: casesApiTags.delete,
                id: 'cases_delete',
                name: i18n.translate(
                  'xpack.securitySolution.featureRegistry.deleteSubFeatureDetails',
                  {
                    defaultMessage: 'Delete cases and comments',
                  }
                ),
                includeIn: 'all',
                savedObject: {
                  all: [],
                  read: [],
                },
                cases: {
                  delete: [APP_ID],
                },
                ui: casesCapabilities.delete,
              },
            ],
          },
        ],
      },
    ],
  };
};
