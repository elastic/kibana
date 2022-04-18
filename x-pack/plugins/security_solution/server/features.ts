/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { KibanaFeatureConfig, SubFeatureConfig } from '@kbn/features-plugin/common';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { APP_ID, CASES_FEATURE_ID, SERVER_APP_ID } from '../common/constants';
import { savedObjectTypes } from './saved_objects';

export const getCasesKibanaFeature = (): KibanaFeatureConfig => ({
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
      app: [CASES_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      cases: {
        all: [APP_ID],
      },
      api: [],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['crud_cases', 'read_cases'], // uiCapabilities[CASES_FEATURE_ID].crud_cases or read_cases
    },
    read: {
      app: [CASES_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      cases: {
        read: [APP_ID],
      },
      api: [],
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['read_cases'], // uiCapabilities[CASES_FEATURE_ID].read_cases
    },
  },
});

export const getAlertsSubFeature = (ruleTypes: string[]): SubFeatureConfig => ({
  name: i18n.translate('xpack.securitySolution.featureRegistry.manageAlertsName', {
    defaultMessage: 'Alerts',
  }),
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          id: 'alerts_all',
          name: i18n.translate('xpack.securitySolution.featureRegistry.subfeature.alertsAllName', {
            defaultMessage: 'All',
          }),
          includeIn: 'all' as 'all',
          alerting: {
            alert: {
              all: ruleTypes,
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['crud_alerts', 'read_alerts'],
        },
        {
          id: 'alerts_read',
          name: i18n.translate('xpack.securitySolution.featureRegistry.subfeature.alertsReadName', {
            defaultMessage: 'Read',
          }),
          includeIn: 'read' as 'read',
          alerting: {
            alert: {
              read: ruleTypes,
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['read_alerts'],
        },
      ],
    },
  ],
});

export const getKibanaPrivilegesFeaturePrivileges = (ruleTypes: string[]): KibanaFeatureConfig => ({
  id: SERVER_APP_ID,
  name: i18n.translate('xpack.securitySolution.featureRegistry.linkSecuritySolutionTitle', {
    defaultMessage: 'Security',
  }),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [APP_ID, 'kibana'],
  catalogue: [APP_ID],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: ruleTypes,
  subFeatures: [],
  privileges: {
    all: {
      app: [APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'lists-all', 'lists-read', 'lists-summary', 'rac'],
      savedObject: {
        all: [
          'alert',
          'exception-list',
          'exception-list-agnostic',
          DATA_VIEW_SAVED_OBJECT_TYPE,
          ...savedObjectTypes,
        ],
        read: [],
      },
      alerting: {
        rule: {
          all: ruleTypes,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'crud'],
    },
    read: {
      app: [APP_ID, 'kibana'],
      catalogue: [APP_ID],
      api: [APP_ID, 'lists-read', 'rac'],
      savedObject: {
        all: [],
        read: [
          'exception-list',
          'exception-list-agnostic',
          DATA_VIEW_SAVED_OBJECT_TYPE,
          ...savedObjectTypes,
        ],
      },
      alerting: {
        rule: {
          read: ruleTypes,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show'],
    },
  },
});
