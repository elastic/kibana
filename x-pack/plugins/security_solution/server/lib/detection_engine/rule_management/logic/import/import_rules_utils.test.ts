/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getImportRulesSchemaMock } from '../../../../../../common/api/detection_engine/rule_management/mocks';
import { getQueryRuleParams } from '../../../rule_schema/mocks';

import { requestContextMock } from '../../../routes/__mocks__';
import {
  getRuleMock,
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../../../routes/__mocks__/request_responses';

import { createRules } from '../crud/create_rules';
import { updateRules } from '../crud/update_rules';
import { importRules } from './import_rules_utils';

jest.mock('../crud/create_rules');
jest.mock('../crud/update_rules');

describe('importRules', () => {
  const mlAuthz = {
    validateRuleType: jest
      .fn()
      .mockResolvedValue({ valid: true, message: 'mocked validation message' }),
  };
  const { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
    clients.rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    clients.actionsClient.getAll.mockResolvedValue([]);

    jest.clearAllMocks();
  });

  it('returns rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([]);
  });

  it('returns 400 error if "ruleChunks" includes Error', async () => {
    const result = await importRules({
      ruleChunks: [[new Error('error importing')]],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      rulesClient: context.alerting.getRulesClient(),
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

  it('creates rule if no matching existing rule found', async () => {
    const result = await importRules({
      ruleChunks: [[getImportRulesSchemaMock({ rule_id: 'rule-1' })]],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([{ rule_id: 'rule-1', status_code: 200 }]);
    expect(createRules).toHaveBeenCalled();
    expect(updateRules).not.toHaveBeenCalled();
  });

  it('reports error if "overwriteRules" is "false" and matching rule found', async () => {
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    const result = await importRules({
      ruleChunks: [[getImportRulesSchemaMock({ rule_id: 'rule-1' })]],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: { message: 'rule_id: "rule-1" already exists', status_code: 409 },
        rule_id: 'rule-1',
      },
    ]);
    expect(createRules).not.toHaveBeenCalled();
    expect(updateRules).not.toHaveBeenCalled();
  });

  it('updates rule if "overwriteRules" is "true" and matching rule found', async () => {
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    const result = await importRules({
      ruleChunks: [
        [
          getImportRulesSchemaMock({
            rule_id: 'rule-1',
          }),
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([{ rule_id: 'rule-1', status_code: 200 }]);
    expect(createRules).not.toHaveBeenCalled();
    expect(updateRules).toHaveBeenCalled();
  });

  /**
   * Existing rule may have nullable fields set to a value (e.g. `timestamp_override` is set to `some.value`) but
   * a rule to import doesn't have these fields set (e.g. `timestamp_override` is NOT present at all in the ndjson file).
   * We expect the updated rule won't have such fields preserved (e.g. `timestamp_override` will be removed).
   *
   * Unit test is only able to check `updateRules()` receives a proper update object.
   */
  it('ensures overwritten rule DOES NOT preserve fields missed in the imported rule when "overwriteRules" is "true" and matching rule found', async () => {
    const existingRule = getRuleMock(
      getQueryRuleParams({
        timestampOverride: 'some.value',
      })
    );

    clients.rulesClient.find.mockResolvedValue(
      getFindResultWithMultiHits({ data: [existingRule] })
    );

    const result = await importRules({
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([{ rule_id: 'rule-1', status_code: 200 }]);
    expect(createRules).not.toHaveBeenCalled();
    expect(updateRules).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleUpdate: expect.not.objectContaining({
          timestamp_override: expect.anything(),
          timestampOverride: expect.anything(),
        }),
      })
    );
  });

  it('reports error if rulesClient throws', async () => {
    clients.rulesClient.find.mockRejectedValue(new Error('error reading rule'));

    const result = await importRules({
      ruleChunks: [[getImportRulesSchemaMock({ rule_id: 'rule-1' })]],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: {
          message: 'error reading rule',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
    expect(createRules).not.toHaveBeenCalled();
    expect(updateRules).not.toHaveBeenCalled();
  });

  it('reports error if "createRules" throws', async () => {
    (createRules as jest.Mock).mockRejectedValue(new Error('error creating rule'));

    const result = await importRules({
      ruleChunks: [[getImportRulesSchemaMock({ rule_id: 'rule-1' })]],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: {
          message: 'error creating rule',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
  });

  it('reports error if "updateRules" throws', async () => {
    (updateRules as jest.Mock).mockRejectedValue(new Error('import rule error'));
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    const result = await importRules({
      ruleChunks: [[getImportRulesSchemaMock({ rule_id: 'rule-1' })]],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      rulesClient: context.alerting.getRulesClient(),
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: {
          message: 'import rule error',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
  });
});
