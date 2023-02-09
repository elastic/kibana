/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { syntheticsParamType } from '../common/types/saved_objects';
import { SYNTHETICS_RULE_TYPES } from '../common/constants/synthetics_alerts';
import { privateLocationsSavedObjectName } from '../common/saved_objects/private_locations';
import { PLUGIN } from '../common/constants/plugin';
import { UPTIME_RULE_TYPES } from '../common/constants/uptime_alerts';
import { umDynamicSettings } from './legacy_uptime/lib/saved_objects/uptime_settings';
import { syntheticsMonitorType } from './legacy_uptime/lib/saved_objects/synthetics_monitor';
import { syntheticsApiKeyObjectType } from './legacy_uptime/lib/saved_objects/service_api_key';

export const uptimeFeature = {
  id: PLUGIN.ID,
  name: PLUGIN.NAME,
  order: 1000,
  category: DEFAULT_APP_CATEGORIES.observability,
  app: ['uptime', 'kibana', 'synthetics'],
  catalogue: ['uptime'],
  management: {
    insightsAndAlerting: ['triggersActions'],
  },
  alerting: [...UPTIME_RULE_TYPES, ...SYNTHETICS_RULE_TYPES],
  privileges: {
    all: {
      app: ['uptime', 'kibana', 'synthetics'],
      catalogue: ['uptime'],
      api: ['uptime-read', 'uptime-write', 'lists-all'],
      savedObject: {
        all: [
          umDynamicSettings.name,
          syntheticsMonitorType,
          syntheticsApiKeyObjectType,
          privateLocationsSavedObjectName,
          syntheticsParamType,
        ],
        read: [],
      },
      alerting: {
        rule: {
          all: [...UPTIME_RULE_TYPES, ...SYNTHETICS_RULE_TYPES],
        },
        alert: {
          all: [...UPTIME_RULE_TYPES, ...SYNTHETICS_RULE_TYPES],
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
      api: ['uptime-read', 'lists-read'],
      savedObject: {
        all: [],
        read: [
          syntheticsParamType,
          umDynamicSettings.name,
          syntheticsMonitorType,
          syntheticsApiKeyObjectType,
          privateLocationsSavedObjectName,
        ],
      },
      alerting: {
        rule: {
          read: [...UPTIME_RULE_TYPES, ...SYNTHETICS_RULE_TYPES],
        },
        alert: {
          read: [...UPTIME_RULE_TYPES, ...SYNTHETICS_RULE_TYPES],
        },
      },
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      ui: ['show', 'alerting:save'],
    },
  },
};
