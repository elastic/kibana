/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { i18n } from '@kbn/i18n';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import {
  ACTION_SAVED_OBJECT_TYPE,
  ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
  CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
} from './constants/saved_objects';

const EDR_EXECUTE_PRIVILEGE_API_TAG = 'actions:execute-edr-connectors';
export const EDR_EXECUTE_PRIVILEGE = `api:${EDR_EXECUTE_PRIVILEGE_API_TAG}`;
export const EDR_SUB_ACTIONS_EXECUTE_PRIVILEGE = `api:actions:execute-edr-sub-actions`;

/**
 * The order of appearance in the feature privilege page
 * under the management section.
 */
const FEATURE_ORDER = 3000;

export const ACTIONS_FEATURE = {
  id: 'actions',
  name: i18n.translate('xpack.actions.featureRegistry.actionsFeatureName', {
    defaultMessage: 'Actions and Connectors',
  }),
  category: DEFAULT_APP_CATEGORIES.management,
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  app: [],
  order: FEATURE_ORDER,
  management: {
    insightsAndAlerting: ['triggersActions', 'triggersActionsConnectors'],
  },
  privileges: {
    all: {
      app: [],
      api: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions', 'triggersActionsConnectors'],
      },
      savedObject: {
        all: [
          ACTION_SAVED_OBJECT_TYPE,
          ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE,
          CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        ],
        read: [],
      },
      ui: ['show', 'execute', 'save', 'delete'],
    },
    read: {
      app: [],
      api: [],
      catalogue: [],
      management: {
        insightsAndAlerting: ['triggersActions', 'triggersActionsConnectors'],
      },
      savedObject: {
        // action execution requires 'read' over `actions`, but 'all' over `action_task_params`
        all: [ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, CONNECTOR_TOKEN_SAVED_OBJECT_TYPE],
        read: [ACTION_SAVED_OBJECT_TYPE],
      },
      ui: ['show', 'execute'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.actions.featureRegistry.edrSubFeatureName', {
        defaultMessage: 'Endpoint Security',
      }),
      description: i18n.translate('xpack.actions.featureRegistry.edrSubFeatureDescription', {
        defaultMessage: 'Includes: Sentinel One, Crowdstrike',
      }),
      privilegeGroups: [
        {
          groupType: 'independent',
          privileges: [
            {
              api: [EDR_EXECUTE_PRIVILEGE_API_TAG],
              id: 'executeEdrConnectors',
              name: i18n.translate('xpack.actions.featureRegistry.edrSubFeaturePrivilege', {
                defaultMessage: 'Execute',
              }),
              includeIn: 'all',
              savedObject: {
                all: [ACTION_TASK_PARAMS_SAVED_OBJECT_TYPE, CONNECTOR_TOKEN_SAVED_OBJECT_TYPE],
                read: [ACTION_SAVED_OBJECT_TYPE],
              },
              ui: ['executeSubFeature'],
            },
          ],
        },
      ],
    },
  ],
};
