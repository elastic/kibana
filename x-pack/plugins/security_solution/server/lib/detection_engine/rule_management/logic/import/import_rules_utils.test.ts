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
import { prebuiltRulesImporterMock } from '../../../prebuilt_rules/logic/prebuilt_rules_importer.mock';

import { importRules } from './import_rules_utils';
import { createBulkErrorObject } from '../../../routes/utils';

describe('importRules', () => {
  const { clients, context } = requestContextMock.createTools();
  const ruleToImport = getImportRulesSchemaMock();

  let savedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockPrebuiltRulesImporter: ReturnType<typeof prebuiltRulesImporterMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    savedObjectsClient = savedObjectsClientMock.create();
    mockPrebuiltRulesImporter = prebuiltRulesImporterMock.create();
  });

  it('returns an empty rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      savedObjectsClient,
      prebuiltRulesImporter: mockPrebuiltRulesImporter,
    });

    expect(result).toEqual([]);
  });

  it('returns 400 error if "ruleChunks" includes Error', async () => {
    const result = await importRules({
      ruleChunks: [[new Error('error importing')]],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
      prebuiltRulesImporter: mockPrebuiltRulesImporter,
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
      prebuiltRulesImporter: mockPrebuiltRulesImporter,
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
      prebuiltRulesImporter: mockPrebuiltRulesImporter,
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

    it('rejects a prebuilt rule when allowPrebuiltRules is false', async () => {
      const ruleChunk = [prebuiltRuleToImport];
      const result = await importRules({
        ruleChunks: [ruleChunk],
        rulesResponseAcc: [],
        overwriteRules: false,
        detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
        prebuiltRulesImporter: mockPrebuiltRulesImporter,
        allowPrebuiltRules: false,
        savedObjectsClient,
      });

      expect(result).toEqual([
        {
          error: {
            message:
              'Importing prebuilt rules is not supported. To import this rule as a custom rule, remove its "immutable" property try again.',
            status_code: 400,
          },
          rule_id: prebuiltRuleToImport.rule_id,
        },
      ]);
    });

    it('rejects a prebuilt rule when version is missing', async () => {
      // @ts-expect-error version is required on the type
      delete prebuiltRuleToImport.version;
      const ruleChunk = [prebuiltRuleToImport];
      const result = await importRules({
        ruleChunks: [ruleChunk],
        rulesResponseAcc: [],
        overwriteRules: false,
        detectionRulesClient: context.securitySolution.getDetectionRulesClient(),
        prebuiltRulesImporter: mockPrebuiltRulesImporter,
        allowPrebuiltRules: false,
        savedObjectsClient,
      });

      expect(result).toEqual([
        {
          error: {
            message:
              'Importing prebuilt rules is not supported. To import this rule as a custom rule, remove its "immutable" property try again.',
            status_code: 400,
          },
          rule_id: prebuiltRuleToImport.rule_id,
        },
      ]);
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
        prebuiltRulesImporter: mockPrebuiltRulesImporter,
        savedObjectsClient,
      });

      expect(result).toEqual([{ rule_id: prebuiltRuleToImport.rule_id, status_code: 200 }]);
    });
  });
});
