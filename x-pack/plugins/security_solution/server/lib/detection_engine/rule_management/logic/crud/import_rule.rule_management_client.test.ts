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

jest.mock('./read_rules');

describe('RuleManagementClient.importRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
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
    await importRule(rulesClient, {
      ruleToImport,
      overwriteRules: true,
      options: { allowMissingConnectorSecrets },
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
        options: {},
        allowMissingConnectorSecrets,
      })
    );
  });

  describe('when rule_id matches an installed rule', () => {
    it('calls rulesClient.update with the correct parameters when overwriteRules is true', async () => {
      (readRules as jest.Mock).mockResolvedValue(existingRule);
      await importRule(rulesClient, {
        ruleToImport,
        overwriteRules: true,
        options: { allowMissingConnectorSecrets },
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

    it('rejects when overwriteRules is false', async () => {
      (readRules as jest.Mock).mockResolvedValue(existingRule);
      await expect(
        importRule(rulesClient, {
          ruleToImport,
          overwriteRules: false,
          options: { allowMissingConnectorSecrets },
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
