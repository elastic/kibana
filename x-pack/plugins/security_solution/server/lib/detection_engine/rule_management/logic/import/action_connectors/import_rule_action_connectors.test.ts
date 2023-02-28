/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client.mock';
import {
  getImportRulesSchemaMock,
  webHookConnector,
} from '../../../../../../../common/detection_engine/rule_management/model/import/rule_to_import.mock';
import { importRuleActionConnectors } from './import_rule_action_connectors';
import { coreMock } from '@kbn/core/server/mocks';

const rules = [
  {
    ...getImportRulesSchemaMock(),
    actions: [
      {
        group: 'default',
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        action_type_id: '.webhook',
        params: {},
      },
    ],
  },
];
const rulesWithoutActions = [
  {
    ...getImportRulesSchemaMock(),
    actions: [],
  },
];
const actionConnectors = [webHookConnector];
const actionsClient = actionsClientMock.create();
actionsClient.getAll.mockResolvedValue([]);
const core = coreMock.createRequestHandlerContext();

describe('importRuleActionConnectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should show an error message when the user has a Read Actions permission and stops the importing ', async () => {
    const newCore = coreMock.createRequestHandlerContext();
    const error = {
      output: { payload: { message: 'Unable to bulk_create action' }, statusCode: 403 },
    };
    newCore.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockImplementation(() => {
        throw error;
      }),
    });
    const actionsImporter2 = newCore.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter2() as never,
      rules,
      overwrite: false,
    });

    expect(res).toEqual({
      success: false,
      successCount: 0,
      errors: [
        {
          error: {
            message:
              'You may not have actions privileges required to import rules with actions: Unable to bulk_create action',
            status_code: 403,
          },
          rule_id: '(unknown id)',
        },
      ],
      warnings: [],
    });
  });

  it('should return import 1 connector successfully', async () => {
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        successResults: [],
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter() as never,
      rules,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 1,
      successResults: [],
      errors: [],
      warnings: [],
    });
  });
  it('should return import 1 connector successfully only if id is duplicated', async () => {
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        successResults: [],
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;

    const ruleWith2Connectors = [
      {
        ...getImportRulesSchemaMock(),
        actions: [
          {
            group: 'default',
            id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            action_type_id: '.slack',
          },
          {
            group: 'default',
            id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} alerts',
            },
            action_type_id: '.slack',
          },
        ],
      },
    ];
    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter() as never,
      rules: ruleWith2Connectors,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 1,
      successResults: [],
      errors: [],
      warnings: [],
    });
  });

  it('should show an error message when the user has an old imported rule with a missing connector data', async () => {
    const actionsImporter = core.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors: [],
      actionsClient,
      actionsImporter: actionsImporter() as never,
      rules,
      overwrite: false,
    });

    expect(res).toEqual({
      success: false,
      successCount: 0,
      errors: [
        {
          error: {
            message:
              '1 connector is missing. Connector id missing is: cabc78e0-9031-11ed-b076-53cc4d57aaf1',
            status_code: 404,
          },
          id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
          rule_id: 'rule-1',
        },
      ],
      warnings: [],
    });
  });
  it('should show an error message when the user has an old imported rule with a 2 missing connectors data', async () => {
    const actionsImporter = core.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors: [],
      actionsClient,
      actionsImporter: actionsImporter() as never,
      rules: [
        {
          ...getImportRulesSchemaMock(),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
              action_type_id: '.webhook',
              params: {},
            },
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf2',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        },
      ],
      overwrite: false,
    });

    expect(res).toEqual({
      success: false,
      successCount: 0,
      errors: [
        {
          error: {
            message:
              '2 connectors are missing. Connector ids missing are: cabc78e0-9031-11ed-b076-53cc4d57aaf1, cabc78e0-9031-11ed-b076-53cc4d57aaf2',
            status_code: 404,
          },
          rule_id: 'rule-1',
          id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1,cabc78e0-9031-11ed-b076-53cc4d57aaf2',
        },
      ],
      warnings: [],
    });
  });
  it('should show an error message when the user has 2 imported rules with a 2 missing connectors data', async () => {
    const actionsImporter = core.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors: [],
      actionsClient,
      actionsImporter: actionsImporter() as never,
      rules: [
        {
          ...getImportRulesSchemaMock(),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        },
        {
          ...getImportRulesSchemaMock('rule-2'),
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf2',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        },
      ],
      overwrite: false,
    });

    expect(res).toEqual({
      success: false,
      successCount: 0,
      errors: [
        {
          error: {
            message:
              '2 connectors are missing. Connector ids missing are: cabc78e0-9031-11ed-b076-53cc4d57aaf1, cabc78e0-9031-11ed-b076-53cc4d57aaf2',
            status_code: 404,
          },
          rule_id: 'rule-1,rule-2',
          id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1,cabc78e0-9031-11ed-b076-53cc4d57aaf2',
        },
      ],
      warnings: [],
    });
  });

  it('should skip importing the action-connectors if the actions array is empty, even if the user has exported-connectors in the file', async () => {
    core.savedObjects.getImporter = jest.fn().mockReturnValue({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 2,
        successResults: [],
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter2 = core.savedObjects.getImporter;
    const actionsImporter2Import = actionsImporter2().import;

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter2Import as never,
      rules: rulesWithoutActions,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 0,
      errors: [],
      warnings: [],
    });
    expect(actionsImporter2Import).not.toBeCalled();
  });

  it('should skip importing the action-connectors if all connectors have been imported/created before', async () => {
    actionsClient.getAll.mockResolvedValue([
      {
        actionTypeId: '.webhook',
        name: 'webhook',
        isPreconfigured: true,
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        referencedByCount: 1,
        isDeprecated: false,
      },
    ]);
    const actionsImporter2 = core.savedObjects.getImporter;
    const actionsImporter2Import = actionsImporter2().import;

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter2Import as never,
      rules,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 0,
      errors: [],
      warnings: [],
    });
    expect(actionsImporter2Import).not.toBeCalled();
  });

  it('should not skip importing the action-connectors if all connectors have been imported/created before when overwrite is true', async () => {
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        successResults: [],
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;

    actionsClient.getAll.mockResolvedValue([
      {
        actionTypeId: '.webhook',
        name: 'webhook',
        isPreconfigured: true,
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        referencedByCount: 1,
        isDeprecated: false,
      },
    ]);

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter() as never,
      rules,
      overwrite: true,
    });

    expect(res).toEqual({
      success: true,
      successCount: 1,
      errors: [],
      warnings: [],
      successResults: [],
    });
  });
});
