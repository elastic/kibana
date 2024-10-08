/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { ActionsClient } from '@kbn/actions-plugin/server';

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  getCreateRulesSchemaMock,
  getRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { getRuleByRuleId } from './methods/get_rule_by_rule_id';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

jest.mock('./methods/get_rule_by_rule_id');

describe('DetectionRulesClient.importRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();
  let actionsClient: jest.Mocked<ActionsClient>;

  const immutable = false as const; // Can only take value of false
  const allowMissingConnectorSecrets = true;
  const ruleToImport = {
    ...getCreateRulesSchemaMock(),
    tags: ['import-tag'],
    rule_id: 'rule-id',
    version: 1,
    immutable,
  };
  const existingRule = getRulesSchemaMock();
  existingRule.rule_id = ruleToImport.rule_id;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    rulesClient.create.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    const savedObjectsClient = savedObjectsClientMock.create();
    detectionRulesClient = createDetectionRulesClient({
      actionsClient,
      rulesClient,
      mlAuthz,
      savedObjectsClient,
    });
  });

  it('calls rulesClient.create with the correct parameters when rule_id does not match an installed rule', async () => {
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(null);
    await detectionRulesClient.importRule({
      ruleToImport,
      overwriteRules: true,
      allowMissingConnectorSecrets,
    });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: ruleToImport.name,
          tags: ruleToImport.tags,
          params: expect.objectContaining({
            immutable,
            ruleId: ruleToImport.rule_id,
            version: ruleToImport.version,
          }),
        }),
        allowMissingConnectorSecrets,
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    await expect(
      detectionRulesClient.importRule({
        ruleToImport,
        overwriteRules: true,
        allowMissingConnectorSecrets,
      })
    ).rejects.toThrow('mocked MLAuth error');

    expect(rulesClient.create).not.toHaveBeenCalled();
    expect(rulesClient.update).not.toHaveBeenCalled();
  });

  describe('when rule_id matches an installed rule', () => {
    it('calls rulesClient.update with the correct parameters when overwriteRules is true', async () => {
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

      await detectionRulesClient.importRule({
        ruleToImport,
        overwriteRules: true,
        allowMissingConnectorSecrets,
      });

      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: ruleToImport.name,
            tags: ruleToImport.tags,
            params: expect.objectContaining({
              index: ruleToImport.index,
              description: ruleToImport.description,
            }),
          }),
          id: existingRule.id,
        })
      );
    });

    /**
     * Existing rule may have nullable fields set to a value (e.g. `timestamp_override` is set to `some.value`) but
     * a rule to import doesn't have these fields set (e.g. `timestamp_override` is NOT present at all in the ndjson file).
     * We expect the updated rule won't have such fields preserved (e.g. `timestamp_override` will be removed).
     *
     * Unit test is only able to check `updateRules()` receives a proper update object.
     */
    it('ensures overwritten rule DOES NOT preserve fields missed in the imported rule when "overwriteRules" is "true" and matching rule found', async () => {
      const existingRuleWithTimestampOverride = {
        ...existingRule,
        timestamp_override: '2020-01-01T00:00:00Z',
      };
      (getRuleByRuleId as jest.Mock).mockResolvedValue(existingRuleWithTimestampOverride);

      await detectionRulesClient.importRule({
        ruleToImport: {
          ...ruleToImport,
          timestamp_override: undefined,
        },
        overwriteRules: true,
        allowMissingConnectorSecrets,
      });

      expect(rulesClient.create).not.toHaveBeenCalled();
      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingRule.id,
          data: expect.not.objectContaining({
            timestamp_override: expect.anything(),
            timestampOverride: expect.anything(),
          }),
        })
      );
    });

    it('enables the rule if the imported rule has enabled: true', async () => {
      const disabledExistingRule = {
        ...existingRule,
        enabled: false,
      };
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(disabledExistingRule);

      const rule = await detectionRulesClient.importRule({
        ruleToImport: {
          ...ruleToImport,
          enabled: true,
        },
        overwriteRules: true,
        allowMissingConnectorSecrets,
      });

      expect(rulesClient.create).not.toHaveBeenCalled();
      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingRule.id,
          data: expect.not.objectContaining({
            enabled: expect.anything(),
          }),
        })
      );

      expect(rule.enabled).toBe(true);
      expect(rulesClient.enableRule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingRule.id,
        })
      );
    });

    it('disables the rule if the imported rule has enabled: false', async () => {
      const enabledExistingRule = {
        ...existingRule,
        enabled: true,
      };
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(enabledExistingRule);

      const rule = await detectionRulesClient.importRule({
        ruleToImport: {
          ...ruleToImport,
          enabled: false,
        },
        overwriteRules: true,
        allowMissingConnectorSecrets,
      });

      expect(rulesClient.create).not.toHaveBeenCalled();
      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingRule.id,
          data: expect.not.objectContaining({
            enabled: expect.anything(),
          }),
        })
      );

      expect(rule.enabled).toBe(false);
      expect(rulesClient.disableRule).toHaveBeenCalledWith(
        expect.objectContaining({
          id: existingRule.id,
        })
      );
    });

    it('rejects when overwriteRules is false', async () => {
      (getRuleByRuleId as jest.Mock).mockResolvedValue(existingRule);
      await expect(
        detectionRulesClient.importRule({
          ruleToImport,
          overwriteRules: false,
          allowMissingConnectorSecrets,
        })
      ).rejects.toMatchObject({
        error: {
          status_code: 409,
          message: `rule_id: "${ruleToImport.rule_id}" already exists`,
        },
        rule_id: ruleToImport.rule_id,
      });
    });
  });
});
