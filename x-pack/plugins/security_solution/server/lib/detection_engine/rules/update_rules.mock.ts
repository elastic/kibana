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
import { getAlertMock } from '../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

export const getUpdateRulesOptionsMock = () => ({
  spaceId: 'default',
  rulesClient: rulesClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  defaultOutputIndex: '.siem-signals-default',
  existingRule: getAlertMock(getQueryRuleParams()),
  migratedRule: getAlertMock(getQueryRuleParams()),
  ruleUpdate: getUpdateRulesSchemaMock(),
});

export const getUpdateMlRulesOptionsMock = () => ({
  spaceId: 'default',
  rulesClient: rulesClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  defaultOutputIndex: '.siem-signals-default',
  existingRule: getAlertMock(getQueryRuleParams()),
  migratedRule: getAlertMock(getQueryRuleParams()),
  ruleUpdate: getUpdateMachineLearningSchemaMock(),
});
