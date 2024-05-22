/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getQueryRuleParams } from '../../../rule_schema/mocks';

import { requestContextMock } from '../../../routes/__mocks__';
import { getRuleMock, getEmptyFindResult } from '../../../routes/__mocks__/request_responses';

import { importRules } from './import_rules_utils';
import { createBulkErrorObject } from '../../../routes/utils';

describe('importRules', () => {
  const { clients, context } = requestContextMock.createTools();
  const importedRule = getRuleMock(getQueryRuleParams());

  beforeEach(() => {
    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
    clients.rulesClient.update.mockResolvedValue(importedRule);
    clients.rulesManagementClient.importRule.mockResolvedValue(importedRule);
    clients.actionsClient.getAll.mockResolvedValue([]);

    jest.clearAllMocks();
  });

  it('returns rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      rulesResponseAcc: [],
      overwriteRules: false,
      rulesManagementClient: context.securitySolution.getRulesManagementClient(),
      existingLists: {},
    });

    expect(result).toEqual([]);
  });

  it('returns 400 error if "ruleChunks" includes Error', async () => {
    const result = await importRules({
      ruleChunks: [[new Error('error importing')]],
      rulesResponseAcc: [],
      overwriteRules: false,
      rulesManagementClient: context.securitySolution.getRulesManagementClient(),
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: {
          message: 'error importing',
          status_code: 400,
        },
        rule_id: '(unknown id)',
      },
    ]);
  });

  it('returns 409 error if ruleManagementClient throws with 409 - existing rule', async () => {
    clients.rulesManagementClient.importRule.mockImplementationOnce(async () => {
      throw createBulkErrorObject({
        ruleId: importedRule.params.ruleId,
        statusCode: 409,
        message: `rule_id: "${importedRule.params.ruleId}" already exists`,
      });
    });
    const ruleChunk = [getImportRulesSchemaMock({ rule_id: importedRule.params.ruleId })];
    const result = await importRules({
      ruleChunks: [ruleChunk],
      rulesResponseAcc: [],
      overwriteRules: false,
      rulesManagementClient: context.securitySolution.getRulesManagementClient(),
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: {
          message: `rule_id: "${importedRule.params.ruleId}" already exists`,
          status_code: 409,
        },
        rule_id: importedRule.params.ruleId,
      },
    ]);
  });
  it('creates rule if no matching existing rule found', async () => {
    const ruleChunk = [getImportRulesSchemaMock({ rule_id: importedRule.params.ruleId })];
    const result = await importRules({
      ruleChunks: [ruleChunk],
      rulesResponseAcc: [],
      overwriteRules: false,
      rulesManagementClient: context.securitySolution.getRulesManagementClient(),
      existingLists: {},
    });

    expect(result).toEqual([{ rule_id: importedRule.params.ruleId, status_code: 200 }]);
  });
});
