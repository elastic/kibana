/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/rule_response_schema.mock';
import { ruleSourceImporterMock } from '../../../prebuilt_rules/logic/rule_source_importer/rule_source_importer.mock';

import { importRules } from './import_rules';
import type { IDetectionRulesClient } from '../detection_rules_client/detection_rules_client_interface';
import { detectionRulesClientMock } from '../detection_rules_client/__mocks__/detection_rules_client';
import { createRuleImportErrorObject } from './errors';

describe('importRules', () => {
  let ruleToImport: ReturnType<typeof getImportRulesSchemaMock>;

  let detectionRulesClient: jest.Mocked<IDetectionRulesClient>;
  let mockRuleSourceImporter: ReturnType<typeof ruleSourceImporterMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    detectionRulesClient = detectionRulesClientMock.create();
    detectionRulesClient.importRules.mockResolvedValue([]);
    ruleToImport = getImportRulesSchemaMock();
    mockRuleSourceImporter = ruleSourceImporterMock.create();
  });

  it('returns an empty rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([]);
  });

  it('returns 400 errors if import was attempted on errored rules', async () => {
    const rules = [new Error('error parsing'), new Error('error parsing')];

    const result = await importRules({
      ruleChunks: [rules],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'error parsing',
          status_code: 400,
        },
        rule_id: '(unknown id)',
      },
      {
        error: {
          message: 'error parsing',
          status_code: 400,
        },
        rule_id: '(unknown id)',
      },
    ]);
  });

  it('returns 400 errors if client import returns generic errors', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import error',
      }),
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import error',
      }),
    ]);

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'import error',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
      {
        error: {
          message: 'import error',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
    ]);
  });

  it('returns 409 errors if client import returns conflict errors', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'import conflict',
        type: 'conflict',
      }),
      createRuleImportErrorObject({
        ruleId: 'rule-id-2',
        message: 'import conflict',
        type: 'conflict',
      }),
    ]);

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'import conflict',
          status_code: 409,
        },
        rule_id: 'rule-id',
      },
      {
        error: {
          message: 'import conflict',
          status_code: 409,
        },
        rule_id: 'rule-id-2',
      },
    ]);
  });

  it('returns a combination of 200s and 4xxs if some rules were imported and some errored', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'parse error',
      }),
      getRulesSchemaMock(),
      createRuleImportErrorObject({
        ruleId: 'rule-id-2',
        message: 'import conflict',
        type: 'conflict',
      }),
      getRulesSchemaMock(),
    ]);
    const successfulRuleId = getRulesSchemaMock().rule_id;

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      {
        error: {
          message: 'parse error',
          status_code: 400,
        },
        rule_id: 'rule-id',
      },
      { rule_id: successfulRuleId, status_code: 200 },
      {
        error: {
          message: 'import conflict',
          status_code: 409,
        },
        rule_id: 'rule-id-2',
      },
      { rule_id: successfulRuleId, status_code: 200 },
    ]);
  });

  it('returns 200s if all rules were imported successfully', async () => {
    detectionRulesClient.importRules.mockResolvedValueOnce([
      getRulesSchemaMock(),
      getRulesSchemaMock(),
    ]);
    const successfulRuleId = getRulesSchemaMock().rule_id;

    const result = await importRules({
      ruleChunks: [[ruleToImport]],
      rulesResponseAcc: [],
      overwriteRules: false,
      detectionRulesClient,
      ruleSourceImporter: mockRuleSourceImporter,
    });

    expect(result).toEqual([
      { rule_id: successfulRuleId, status_code: 200 },
      { rule_id: successfulRuleId, status_code: 200 },
    ]);
  });
});
