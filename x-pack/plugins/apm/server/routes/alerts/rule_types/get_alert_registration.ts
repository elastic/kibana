/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRuleTypeAlerts } from '@kbn/alerting-plugin/server/types';
import { experimentalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/experimental_rule_field_map';
import {
  AGENT_NAME,
  PROCESSOR_EVENT,
  SERVICE_ENVIRONMENT,
  SERVICE_LANGUAGE_NAME,
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/es_fields/apm';

export const alertRegistration: IRuleTypeAlerts = {
  registrationContext: 'observability.apm',
  fieldMap: {
    ...experimentalRuleFieldMap,
    [SERVICE_NAME]: {
      type: 'keyword',
      required: false,
    },
    [SERVICE_ENVIRONMENT]: {
      type: 'keyword',
      required: false,
    },
    [TRANSACTION_TYPE]: {
      type: 'keyword',
      required: false,
    },
    [PROCESSOR_EVENT]: {
      type: 'keyword',
      required: false,
    },
    [AGENT_NAME]: {
      type: 'keyword',
      required: false,
    },
    [SERVICE_LANGUAGE_NAME]: {
      type: 'keyword',
      required: false,
    },
    labels: {
      type: 'object',
      dynamic: true,
      required: false,
    },
  },
};
