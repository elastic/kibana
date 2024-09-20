/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { getValidatedRuleToImportMock } from '../../../../../../../common/api/detection_engine/rule_management/mocks';
import { importRuleWithSource } from './import_rule_with_source';
import { buildMlAuthz } from '../../../../../machine_learning/authz';
import { createPrebuiltRuleAssetsClient } from '../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getRuleMock,
} from '../../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../../rule_schema/mocks';

jest.mock('../../../../prebuilt_rules/logic/rule_assets/prebuilt_rule_assets_client');
jest.mock('../../../../../machine_learning/authz');

describe('importRuleWithSource', () => {
  let mockActionsClient: ReturnType<typeof actionsClientMock.create>;
  let mockRulesClient: ReturnType<typeof rulesClientMock.create>;
  let mockMlAuthz: ReturnType<typeof buildMlAuthz>;
  let mockPrebuiltRuleAssetsClient: ReturnType<typeof createPrebuiltRuleAssetsClient>;

  let params: Omit<Parameters<typeof importRuleWithSource>[0], 'importRulePayload'>;

  beforeEach(() => {
    mockActionsClient = actionsClientMock.create();
    mockRulesClient = rulesClientMock.create();
    mockRulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    mockRulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    mockMlAuthz = (buildMlAuthz as jest.Mock)();
    mockPrebuiltRuleAssetsClient = (createPrebuiltRuleAssetsClient as jest.Mock)();
    params = {
      actionsClient: mockActionsClient,
      rulesClient: mockRulesClient,
      prebuiltRuleAssetClient: mockPrebuiltRuleAssetsClient,
      mlAuthz: mockMlAuthz,
    };
  });

  describe('when importing an existing rule', () => {
    let existingRule: ReturnType<typeof getFindResultWithSingleHit>['data'][0];

    beforeEach(() => {
      mockRulesClient.find.mockResolvedValue(getFindResultWithSingleHit());
      [existingRule] = getFindResultWithSingleHit().data;
    });

    it('throws an error if overwriting is disabled', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await expect(
        importRuleWithSource({
          ...params,
          importRulePayload: {
            ruleToImport: rule,
            overwriteRules: false,
          },
        })
      ).rejects.toMatchObject({
        error: {
          type: 'conflict',
          ruleId: 'rule-1',
          message: 'rule_id: "rule-1" already exists',
        },
      });
    });

    it('preserves the passed "rule_source" and "immutable" values', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
          overwriteRules: true,
        },
      });

      expect(mockRulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              immutable: true,
              ruleSource: {
                isCustomized: true,
                type: 'external',
              },
            }),
          }),
        })
      );
    });

    it('TODO REVIEW does not preserve the passed "enabled" value', async () => {
      const disabledRule = {
        ...getValidatedRuleToImportMock(),
        enabled: false,
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: disabledRule,
          overwriteRules: true,
        },
      });

      expect(mockRulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            enabled: expect.anything(),
          }),
        })
      );
    });

    it('TODO REVIEW preserves the existing rule\'s "id" value', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        id: 'some-id',
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
          overwriteRules: true,
        },
      });

      expect(mockRulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingRule.id,
          data: expect.objectContaining({
            params: expect.objectContaining({
              version: existingRule.params.version,
            }),
          }),
        })
      );
    });

    it('TODO REVIEW preserves the existing rule\'s "version" value if left unspecified', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
          overwriteRules: true,
        },
      });

      expect(mockRulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              version: existingRule.params.version,
            }),
          }),
        })
      );
    });

    it('TODO REVIEW preserves the specified "version" value', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        version: 42,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
          overwriteRules: true,
        },
      });

      expect(mockRulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              version: 42,
            }),
          }),
        })
      );
    });
  });

  describe('when importing a new rule', () => {
    beforeEach(() => {
      mockRulesClient.find.mockResolvedValueOnce(getEmptyFindResult());
    });

    it('preserves the passed "rule_source" and "immutable" values', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
        },
      });

      expect(mockRulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            params: expect.objectContaining({
              immutable: true,
              ruleSource: {
                isCustomized: true,
                type: 'external',
              },
            }),
          }),
        })
      );
    });

    it('preserves the passed "enabled" value', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        enabled: true,
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
          overwriteRules: true,
        },
      });

      expect(mockRulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enabled: true,
          }),
        })
      );
    });

    it('defaults defaultable values', async () => {
      const rule = {
        ...getValidatedRuleToImportMock(),
        immutable: true,
        rule_source: {
          type: 'external' as const,
          is_customized: true,
        },
      };

      await importRuleWithSource({
        ...params,
        importRulePayload: {
          ruleToImport: rule,
        },
      });

      expect(mockRulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actions: [],
          }),
        })
      );
    });
  });
});
