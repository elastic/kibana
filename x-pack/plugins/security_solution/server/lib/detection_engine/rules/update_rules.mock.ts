/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import {
  getUpdateMachineLearningSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getRuleMock } from '../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

export const getUpdateRulesOptionsMock = () => ({
  rulesClient: rulesClientMock.create(),
  existingRule: getRuleMock(getQueryRuleParams()),
  ruleUpdate: getUpdateRulesSchemaMock(),
});

export const getUpdateMlRulesOptionsMock = () => ({
  rulesClient: rulesClientMock.create(),
  existingRule: getRuleMock(getQueryRuleParams()),
  ruleUpdate: getUpdateMachineLearningSchemaMock(),
});
