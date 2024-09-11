/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import { requestContextMock } from '../../../routes/__mocks__';
import { prebuiltRulesImportHelperMock } from '../../../prebuilt_rules/logic/prebuilt_rules_import_helper.mock';

import { importRules } from './import_rules_with_source';
import { createBulkErrorObject } from '../../../routes/utils';

describe('importRules', () => {
  const { clients, context } = requestContextMock.createTools();
  const ruleToImport = getImportRulesSchemaMock();

  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockPrebuiltRulesImportHelper: ReturnType<typeof prebuiltRulesImportHelperMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    savedObjectsClient = savedObjectsClientMock.create();
    mockPrebuiltRulesImportHelper = prebuiltRulesImportHelperMock.create();
    mockPrebuiltRulesImportHelper.fetchMatchingAssets.mockResolvedValue([]);
    mockPrebuiltRulesImportHelper.fetchAssetRuleIds.mockResolvedValue([]);
  });

  it('returns an empty rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      savedObjectsClient,
      prebuiltRulesImportHelper: mockPrebuiltRulesImportHelper,
    });

    expect(result).toEqual([]);
  });

  it('returns 400 error if "ruleChunks" includes Error', async () => {
    const result = await importRules({
      ruleChunks: [[new Error('error importing')]],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      prebuiltRulesImportHelper: mockPrebuiltRulesImportHelper,
      savedObjectsClient,
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

  it('returns 409 error if DetectionRulesClient throws with 409 - existing rule', async () => {
    clients.detectionRulesClient.importRule.mockImplementationOnce(async () => {
      throw createBulkErrorObject({
        ruleId: ruleToImport.rule_id,
        statusCode: 409,
        message: `rule_id: "${ruleToImport.rule_id}" already exists`,
      });
    });

    const ruleChunk = [ruleToImport];
    const result = await importRules({
      ruleChunks: [ruleChunk],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      prebuiltRulesImportHelper: mockPrebuiltRulesImportHelper,
      savedObjectsClient,
    });

    expect(result).toEqual([
      {
        error: {
          message: `rule_id: "${ruleToImport.rule_id}" already exists`,
          status_code: 409,
        },
        rule_id: ruleToImport.rule_id,
      },
    ]);
  });

  it('creates rule if no matching existing rule found', async () => {
    clients.detectionRulesClient.importRule.mockResolvedValue({
      ...getRulesSchemaMock(),
      rule_id: ruleToImport.rule_id,
    });

    const ruleChunk = [ruleToImport];
    const result = await importRules({
      ruleChunks: [ruleChunk],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      prebuiltRulesImportHelper: mockPrebuiltRulesImportHelper,
      savedObjectsClient,
    });

    expect(result).toEqual([{ rule_id: ruleToImport.rule_id, status_code: 200 }]);
  });

  describe('compatibility with prebuilt rules', () => {
    let prebuiltRuleToImport: ReturnType<typeof getImportRulesSchemaMock>;

    beforeEach(() => {
      prebuiltRuleToImport = {
        ...getImportRulesSchemaMock(),
        immutable: true,
        version: 1,
      };
    });

    it('imports a prebuilt rule when allowPrebuiltRules is true', async () => {
      clients.detectionRulesClient.importRule.mockResolvedValue({
        ...getRulesSchemaMock(),
        rule_id: prebuiltRuleToImport.rule_id,
      });

      const ruleChunk = [prebuiltRuleToImport];
      const result = await importRules({
        ruleChunks: [ruleChunk],
        rulesResponseAcc: [],
        overwriteRules: false,
        detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
        allowPrebuiltRules: true,
        prebuiltRulesImportHelper: mockPrebuiltRulesImportHelper,
        savedObjectsClient,
      });

      expect(result).toEqual([{ rule_id: prebuiltRuleToImport.rule_id, status_code: 200 }]);
    });
  });
});
