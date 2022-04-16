/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { PublicMethodsOf } from '@kbn/utility-types';
import {
  ReadOperations,
  WriteOperations,
  AlertingAuthorization,
  AlertingAuthorizationEntity,
  AlertingAuthorizationFilterType,
} from '@kbn/alerting-plugin/server';
import {
  ALERT_RULE_CONSUMER,
  ALERT_RULE_TYPE_ID,
} from '../../common/technical_rule_data_field_names';

export async function getAuthzFilter(
  authorization: PublicMethodsOf<AlertingAuthorization>,
  operation: WriteOperations.Update | ReadOperations.Get | ReadOperations.Find
) {
  const { filter } = await authorization.getAuthorizationFilter(
    AlertingAuthorizationEntity.Alert,
    {
      type: AlertingAuthorizationFilterType.ESDSL,
      fieldNames: { consumer: ALERT_RULE_CONSUMER, ruleTypeId: ALERT_RULE_TYPE_ID },
    },
    operation
  );
  return filter;
}
