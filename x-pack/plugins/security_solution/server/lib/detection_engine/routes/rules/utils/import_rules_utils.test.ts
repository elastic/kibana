/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestContextMock } from '../../__mocks__';
import { importRules } from './import_rules_utils';
import {
  getAlertMock,
  getEmptyFindResult,
  getFindResultWithSingleHit,
} from '../../__mocks__/request_responses';
import { getQueryRuleParams } from '../../../schemas/rule_schemas.mock';
import { getImportRulesSchemaDecodedMock } from '../../../../../../common/detection_engine/schemas/request/import_rules_schema.mock';
import { createRules } from '../../../rules/create_rules';
import { patchRules } from '../../../rules/patch_rules';

jest.mock('../../../rules/create_rules');
jest.mock('../../../rules/patch_rules');

describe('importRules', () => {
  const mlAuthz = {
    validateRuleType: jest
      .fn()
      .mockResolvedValue({ valid: true, message: 'mocked validation message' }),
  };
  const { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
    clients.rulesClient.update.mockResolvedValue(getAlertMock(getQueryRuleParams()));
    clients.actionsClient.getAll.mockResolvedValue([]);

    jest.clearAllMocks();
  });

  it('returns rules response if no rules to import', async () => {
    const result = await importRules({
      ruleChunks: [],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
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
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
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
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaDecodedMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
      existingLists: {},
    });

    expect(result).toEqual([{ rule_id: 'rule-1', status_code: 200 }]);
    expect(createRules).toHaveBeenCalled();
    expect(patchRules).not.toHaveBeenCalled();
  });

  it('reports error if "overwriteRules" is "false" and matching rule found', async () => {
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    const result = await importRules({
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaDecodedMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: { message: 'rule_id: "rule-1" already exists', status_code: 409 },
        rule_id: 'rule-1',
      },
    ]);
    expect(createRules).not.toHaveBeenCalled();
    expect(patchRules).not.toHaveBeenCalled();
  });

  it('patches rule if "overwriteRules" is "true" and matching rule found', async () => {
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    const result = await importRules({
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaDecodedMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
      existingLists: {},
    });

    expect(result).toEqual([{ rule_id: 'rule-1', status_code: 200 }]);
    expect(createRules).not.toHaveBeenCalled();
    expect(patchRules).toHaveBeenCalled();
  });

  it('reports error if rulesClient throws', async () => {
    clients.rulesClient.find.mockRejectedValue(new Error('error reading rule'));

    const result = await importRules({
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaDecodedMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
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
    expect(patchRules).not.toHaveBeenCalled();
  });

  it('reports error if "createRules" throws', async () => {
    (createRules as jest.Mock).mockRejectedValue(new Error('error creating rule'));

    const result = await importRules({
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaDecodedMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: false,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
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

  it('reports error if "patchRules" throws', async () => {
    (patchRules as jest.Mock).mockRejectedValue(new Error('error patching rule'));
    clients.rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    const result = await importRules({
      ruleChunks: [
        [
          {
            ...getImportRulesSchemaDecodedMock(),
            rule_id: 'rule-1',
          },
        ],
      ],
      rulesResponseAcc: [],
      mlAuthz,
      overwriteRules: true,
      savedObjectsClient: context.core.savedObjects.client,
      rulesClient: context.alerting.getRulesClient(),
      exceptionsClient: context.lists?.getExceptionListClient(),
      spaceId: 'default',
      signalsIndex: '.signals-index',
      existingLists: {},
    });

    expect(result).toEqual([
      {
        error: {
          message: 'error patching rule',
          status_code: 400,
        },
        rule_id: 'rule-1',
      },
    ]);
  });
});
