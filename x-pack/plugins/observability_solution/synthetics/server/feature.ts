/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  SubFeaturePrivilegeGroupConfig,
  SubFeaturePrivilegeGroupType,
} from '@kbn/features-plugin/common';
import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { UPTIME_RULE_TYPE_IDS, SYNTHETICS_RULE_TYPE_IDS } from '@kbn/rule-data-utils';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { syntheticsMonitorType, syntheticsParamType } from '../common/types/saved_objects';
import { privateLocationsSavedObjectName } from '../common/saved_objects/private_locations';
import { PLUGIN } from '../common/constants/plugin';
import {
  syntheticsSettingsObjectType,
  uptimeSettingsObjectType,
} from './saved_objects/synthetics_settings';
import { syntheticsApiKeyObjectType } from './saved_objects/service_api_key';

const ruleTypes = [...UPTIME_RULE_TYPE_IDS, ...SYNTHETICS_RULE_TYPE_IDS];

const alertingFeatures = ruleTypes.map((ruleTypeId) => ({
  ruleTypeId,
  consumers: [PLUGIN.ID, ALERTING_FEATURE_ID],
}));

const elasticManagedLocationsEnabledPrivilege: SubFeaturePrivilegeGroupConfig = {
  groupType: 'independent' as SubFeaturePrivilegeGroupType,
  privileges: [
    {
      id: 'elastic_managed_locations_enabled',
      name: i18n.translate('xpack.synthetics.features.elasticManagedLocations', {
        defaultMessage: 'Elastic managed locations enabled',
      }),
      includeIn: 'all',
      savedObject: {
        all: [],
        read: [],
      },
      ui: ['elasticManagedLocationsEnabled'],
    },
  ],
};

export const syntheticsFeature = {
  id: PLUGIN.ID,
  name: PLUGIN.NAME,
  order: 1000,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ['uptime', 'kibana', 'synthetics'],
  catalogue: ['uptime'],
  scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: alertingFeatures,
  privileges: {
    all: {
      app: ['uptime', 'kibana', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'uptime-write', 'lists-all', 'rac'],
      savedObject: {
        all: [
          syntheticsSettingsObjectType,
          syntheticsMonitorType,
          syntheticsApiKeyObjectType,
          privateLocationsSavedObjectName,
          syntheticsParamType,
          // uptime settings object is also registered here since feature is shared between synthetics and uptime
          uptimeSettingsObjectType,
        ],
        read: [],
      },
      alerting: {
        rule: {
          all: alertingFeatures,
        },
        alert: {
          all: alertingFeatures,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['save', 'configureSettings', 'show', 'alerting:save'],
    },
    read: {
      app: ['uptime', 'kibana', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'lists-read', 'rac'],
      savedObject: {
        all: [],
        read: [
          syntheticsParamType,
          syntheticsSettingsObjectType,
          syntheticsMonitorType,
          syntheticsApiKeyObjectType,
          privateLocationsSavedObjectName,
          // uptime settings object is also registered here since feature is shared between synthetics and uptime
          uptimeSettingsObjectType,
        ],
      },
      alerting: {
        rule: {
          read: alertingFeatures,
        },
        alert: {
          read: alertingFeatures,
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:save'],
    },
  },
  subFeatures: [
    {
      name: i18n.translate('xpack.synthetics.features.app', {
        defaultMessage: 'Synthetics',
      }),
      privilegeGroups: [elasticManagedLocationsEnabledPrivilege],
    },
  ],
};
