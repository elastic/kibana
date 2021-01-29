/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UpdateRulesOptions } from './types';
import { alertsClientMock } from '../../../../../alerts/server/mocks';
import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import {
  getUpdateRulesSchemaMock,
  getUpdateMachineLearningSchemaMock,
} from '../../../../common/detection_engine/schemas/request/rule_schemas.mock';

export const getUpdateRulesOptionsMock = (): UpdateRulesOptions => ({
  alertsClient: alertsClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  defaultOutputIndex: '.siem-signals-default',
  ruleUpdate: getUpdateRulesSchemaMock(),
});

export const getUpdateMlRulesOptionsMock = (): UpdateRulesOptions => ({
  alertsClient: alertsClientMock.create(),
  savedObjectsClient: savedObjectsClientMock.create(),
  defaultOutputIndex: '.siem-signals-default',
  ruleUpdate: getUpdateMachineLearningSchemaMock(),
});
