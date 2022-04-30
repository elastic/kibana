/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import {
  getUpdateMachineLearningSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { ruleExecutionLogClientMock } from '../rule_execution_log/__mocks__/rule_execution_log_client';
import { getAlertMock } from '../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

export const getUpdateRulesOptionsMock = (isRuleRegistryEnabled: boolean) => ({
  spaceId: 'default',
  rulesClient: rulesClientMock.create(),
  ruleStatusClient: ruleExecutionLogClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  defaultOutputIndex: '.siem-signals-default',
  existingRule: getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
  migratedRule: getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
  ruleUpdate: getUpdateRulesSchemaMock(),
  isRuleRegistryEnabled,
});

export const getUpdateMlRulesOptionsMock = (isRuleRegistryEnabled: boolean) => ({
  spaceId: 'default',
  rulesClient: rulesClientMock.create(),
  ruleStatusClient: ruleExecutionLogClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  defaultOutputIndex: '.siem-signals-default',
  existingRule: getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
  migratedRule: getAlertMock(isRuleRegistryEnabled, getQueryRuleParams()),
  ruleUpdate: getUpdateMachineLearningSchemaMock(),
  isRuleRegistryEnabled,
});
