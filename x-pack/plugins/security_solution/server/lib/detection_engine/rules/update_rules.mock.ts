/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import {
  getUpdateMachineLearningSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { RuleExecutionLogClient } from '../rule_execution_log/__mocks__/rule_execution_log_client';
import { UpdateRulesOptions } from './types';

export const getUpdateRulesOptionsMock = (): UpdateRulesOptions => ({
  spaceId: 'default',
  rulesClient: rulesClientMock.create(),
  ruleStatusClient: new RuleExecutionLogClient(),
  defaultOutputIndex: '.siem-signals-default',
  ruleUpdate: getUpdateRulesSchemaMock(),
});

export const getUpdateMlRulesOptionsMock = (): UpdateRulesOptions => ({
  spaceId: 'default',
  rulesClient: rulesClientMock.create(),
  ruleStatusClient: new RuleExecutionLogClient(),
  defaultOutputIndex: '.siem-signals-default',
  ruleUpdate: getUpdateMachineLearningSchemaMock(),
});
