/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { importRule } from './rules_management_client';
import { readRules } from './read_rules';
import { getCreateRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

jest.mock('./read_rules');

describe('RuleManagementClient.importRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  const mlAuthz = (buildMlAuthz as jest.Mock)();
  const immutable = false as const; // Can only take value of false
  const allowMissingConnectorSecrets = true;
  const ruleToImport = {
    ...getCreateRulesSchemaMock(),
    tags: ['import-tag'],
    rule_id: 'rule-id',
    version: 1,
    immutable,
  };
  const existingRule = getRuleMock({
    ...getQueryRuleParams({
      ruleId: ruleToImport.rule_id,
    }),
  });

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('calls rulesClient.create with the correct parameters when rule_id does not match an installed rule', async () => {
    (readRules as jest.Mock).mockResolvedValue(null);
    await importRule(
      rulesClient,
      {
        ruleToImport,
        overwriteRules: true,
        options: { allowMissingConnectorSecrets },
      },
      mlAuthz
    );

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
        options: {},
        allowMissingConnectorSecrets,
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    await expect(
      importRule(
        rulesClient,
        {
          ruleToImport,
          overwriteRules: true,
          options: { allowMissingConnectorSecrets },
        },
        mlAuthz
      )
    ).rejects.toThrow('mocked MLAuth error');

    expect(rulesClient.create).not.toHaveBeenCalled();
    expect(rulesClient.update).not.toHaveBeenCalled();
  });

  describe('when rule_id matches an installed rule', () => {
    it('calls rulesClient.update with the correct parameters when overwriteRules is true', async () => {
      (readRules as jest.Mock).mockResolvedValue(existingRule);
      await importRule(
        rulesClient,
        {
          ruleToImport,
          overwriteRules: true,
          options: { allowMissingConnectorSecrets },
        },
        mlAuthz
      );

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
        params: {
          ...existingRule.params,
          timestamp_override: '2020-01-01T00:00:00Z',
        },
      };
      (readRules as jest.Mock).mockResolvedValue(existingRuleWithTimestampOverride);

      await importRule(
        rulesClient,
        {
          ruleToImport: {
            ...ruleToImport,
            timestamp_override: undefined,
          },
          overwriteRules: true,
          options: { allowMissingConnectorSecrets },
        },
        mlAuthz
      );

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

    it('rejects when overwriteRules is false', async () => {
      (readRules as jest.Mock).mockResolvedValue(existingRule);
      await expect(
        importRule(
          rulesClient,
          {
            ruleToImport,
            overwriteRules: false,
            options: { allowMissingConnectorSecrets },
          },
          mlAuthz
        )
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
