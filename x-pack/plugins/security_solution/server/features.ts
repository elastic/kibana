/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { KibanaFeatureConfig, SubFeatureConfig } from '../../features/common';
import { DEFAULT_APP_CATEGORIES } from '../../../../src/core/server';
import { APP_ID, SERVER_APP_ID } from '../common/constants';
import { savedObjectTypes } from './saved_objects';

const CASES_SUB_FEATURE: SubFeatureConfig = {
  name: 'Cases',
  privilegeGroups: [
    {
      groupType: 'mutually_exclusive',
      privileges: [
        {
          id: 'cases_all',
          includeIn: 'all',
          name: 'All',
          savedObject: {
            all: [],
            read: [],
          },
          // using variables with underscores here otherwise when we retrieve them from the kibana
          // capabilities in a hook I get type errors regarding boolean | ReadOnly<{[x: string]: boolean}>
          ui: ['crud_cases', 'read_cases'], // uiCapabilities.siem.crud_cases
          cases: {
            all: [APP_ID],
          },
        },
        {
          id: 'cases_read',
          includeIn: 'read',
          name: 'Read',
          savedObject: {
            all: [],
            read: [],
          },
          // using variables with underscores here otherwise when we retrieve them from the kibana
          // capabilities in a hook I get type errors regarding boolean | ReadOnly<{[x: string]: boolean}>
          ui: ['read_cases'], // uiCapabilities.siem.read_cases
          cases: {
            read: [APP_ID],
          },
        },
      ],
    },
  ],
};

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
  catalogue: ['securitySolution'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: ruleTypes,
  cases: [APP_ID],
  subFeatures: [{ ...CASES_SUB_FEATURE }, { ...getAlertsSubFeature(ruleTypes) }],
  privileges: {
    all: {
      app: [APP_ID, 'kibana'],
      catalogue: ['securitySolution'],
      api: ['securitySolution', 'lists-all', 'lists-read', 'rac'],
      savedObject: {
        all: ['alert', 'exception-list', 'exception-list-agnostic', ...savedObjectTypes],
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
      catalogue: ['securitySolution'],
      api: ['securitySolution', 'lists-read', 'rac'],
      savedObject: {
        all: [],
        read: ['exception-list', 'exception-list-agnostic', ...savedObjectTypes],
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
