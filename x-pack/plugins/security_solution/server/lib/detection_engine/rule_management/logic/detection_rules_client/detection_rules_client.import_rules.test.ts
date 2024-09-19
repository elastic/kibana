/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import { buildMlAuthz } from '../../../../machine_learning/__mocks__/authz';
import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { prebuiltRulesImportHelperMock } from '../../../prebuilt_rules/logic/prebuilt_rules_import_helper.mock';
import { createDetectionRulesClient } from './detection_rules_client';
import { importRuleWithSource } from './methods/import_rule_with_source';
import { createRuleImportErrorObject } from '../import/errors';
import { checkRuleExceptionReferences } from '../import/check_rule_exception_references';

jest.mock('./methods/import_rule_with_source');
jest.mock('../import/check_rule_exception_references');

describe('detectionRulesClient.importRules', () => {
  let subject: ReturnType<typeof createDetectionRulesClient>;
  let ruleToImport: ReturnType<typeof getImportRulesSchemaMock>;
  let prebuiltRulesImportHelper: ReturnType<typeof prebuiltRulesImportHelperMock.create>;

  beforeEach(() => {
    subject = createDetectionRulesClient({
      actionsClient: actionsClientMock.create(),
      rulesClient: rulesClientMock.create(),
      mlAuthz: buildMlAuthz(),
      savedObjectsClient: savedObjectsClientMock.create(),
    });

    (checkRuleExceptionReferences as jest.Mock).mockReturnValue([[], []]);
    (importRuleWithSource as jest.Mock).mockResolvedValue(getRulesSchemaMock());

    ruleToImport = getImportRulesSchemaMock();
    prebuiltRulesImportHelper = prebuiltRulesImportHelperMock.create();
    prebuiltRulesImportHelper.fetchAssetRuleIds.mockResolvedValue([]);
    prebuiltRulesImportHelper.fetchMatchingAssets.mockResolvedValue([]);
  });

  it('returns imported rules as RuleResponses if import was successful', async () => {
    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      prebuiltRulesImportHelper,
      rules: [ruleToImport, ruleToImport],
    });

    expect(result).toEqual([getRulesSchemaMock(), getRulesSchemaMock()]);
  });

  it('returns an import error if rule import throws an import error', async () => {
    const importError = createRuleImportErrorObject({
      ruleId: 'rule-id',
      message: 'an error occurred',
    });
    (importRuleWithSource as jest.Mock).mockReset().mockRejectedValueOnce(importError);

    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      prebuiltRulesImportHelper,
      rules: [ruleToImport],
    });

    expect(result).toEqual([importError]);
  });

  it('returns a generic error if rule import throws unexpectedly', async () => {
    const genericError = new Error('an unexpected error occurred');
    (importRuleWithSource as jest.Mock).mockReset().mockRejectedValueOnce(genericError);

    const result = await subject.importRules({
      allowMissingConnectorSecrets: false,
      overwriteRules: false,
      prebuiltRulesImportHelper,
      rules: [ruleToImport],
    });

    expect(result).toEqual([
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'an unexpected error occurred',
          ruleId: ruleToImport.rule_id,
          type: 'unknown',
        }),
      }),
    ]);
  });

  describe('when rule has no exception list references', () => {
    beforeEach(() => {
      (checkRuleExceptionReferences as jest.Mock).mockReset().mockReturnValueOnce([
        [
          createRuleImportErrorObject({
            ruleId: 'rule-id',
            message: 'list not found',
          }),
        ],
        [],
      ]);
    });

    it('returns both exception list reference errors and the imported rule if import succeeds', async () => {
      const result = await subject.importRules({
        allowMissingConnectorSecrets: false,
        overwriteRules: false,
        prebuiltRulesImportHelper,
        rules: [ruleToImport],
      });

      expect(result).toEqual([
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'list not found',
            ruleId: 'rule-id',
            type: 'unknown',
          }),
        }),
        getRulesSchemaMock(),
      ]);
    });

    it('returns both exception list reference errors and the imported rule if import throws an error', async () => {
      const importError = createRuleImportErrorObject({
        ruleId: 'rule-id',
        message: 'an error occurred',
      });
      (importRuleWithSource as jest.Mock).mockReset().mockRejectedValueOnce(importError);

      const result = await subject.importRules({
        allowMissingConnectorSecrets: false,
        overwriteRules: false,
        prebuiltRulesImportHelper,
        rules: [ruleToImport],
      });

      expect(result).toEqual([
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'list not found',
            ruleId: 'rule-id',
            type: 'unknown',
          }),
        }),
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'an error occurred',
            ruleId: 'rule-id',
            type: 'unknown',
          }),
        }),
      ]);
    });
  });
});
