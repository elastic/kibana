/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import {
  getImportRulesSchemaMock,
  webHookConnector,
} from '../../../../../../../common/api/detection_engine/rule_management/import_rules/rule_to_import.mock';
import { importRuleActionConnectors } from './import_rule_action_connectors';
import { coreMock } from '@kbn/core/server/mocks';

const rules = [
  getImportRulesSchemaMock({
    actions: [
      {
        group: 'default',
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        action_type_id: '.webhook',
        params: {},
      },
    ],
  }),
];
const rulesWithoutActions = [getImportRulesSchemaMock({ actions: [] })];
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
      actionsImporter: actionsImporter2(),
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
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter(),
      rules,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 1,
      errors: [],
      warnings: [],
    });
  });
  it('should return import 1 connector successfully only if id is duplicated', async () => {
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;

    const ruleWith2Connectors = [
      getImportRulesSchemaMock({
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
      }),
    ];
    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter(),
      rules: ruleWith2Connectors,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 1,
      errors: [],
      warnings: [],
    });
  });

  it('should show an error message when the user has an old imported rule with a missing connector data', async () => {
    const actionsImporter = core.savedObjects.getImporter;

    const res = await importRuleActionConnectors({
      actionConnectors: [],
      actionsClient,
      actionsImporter: actionsImporter(),
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
      actionsImporter: actionsImporter(),
      rules: [
        getImportRulesSchemaMock({
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
        }),
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
      actionsImporter: actionsImporter(),
      rules: [
        getImportRulesSchemaMock({
          rule_id: 'rule-1',
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        }),
        getImportRulesSchemaMock({
          rule_id: 'rule-2',
          actions: [
            {
              group: 'default',
              id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf2',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        }),
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
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter2 = core.savedObjects.getImporter;
    const actionsImporter2Importer = actionsImporter2();

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter2Importer,
      rules: rulesWithoutActions,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 0,
      errors: [],
      warnings: [],
    });
    expect(actionsImporter2Importer.import).not.toBeCalled();
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
        isSystemAction: false,
      },
    ]);
    const actionsImporter2 = core.savedObjects.getImporter;
    const actionsImporter2Importer = actionsImporter2();

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter2Importer,
      rules,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 0,
      errors: [],
      warnings: [],
    });
    expect(actionsImporter2Importer.import).not.toBeCalled();
  });

  it('should import one rule with connector successfully even if it was exported from different namespaces by generating destinationId and replace the old actionId with it', async () => {
    const successResults = [
      {
        destinationId: '72cab9bb-535f-45dd-b9c2-5bc1bc0db96b',
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        meta: { title: 'Connector: [anotherSpaceSlack]', icon: undefined },
        type: 'action',
      },
    ];
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        successResults,
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;

    actionsClient.getAll.mockResolvedValue([]);

    const res = await importRuleActionConnectors({
      actionConnectors,
      actionsClient,
      actionsImporter: actionsImporter(),
      rules,
      overwrite: false,
    });
    const rulesWithMigratedActions = [
      {
        actions: [
          {
            action_type_id: '.webhook',
            group: 'default',
            id: '72cab9bb-535f-45dd-b9c2-5bc1bc0db96b',
            params: {},
          },
        ],
        description: 'some description',
        immutable: false,
        name: 'Query with a rule id',
        query: 'user.name: root or user.name: admin',
        risk_score: 55,
        rule_id: 'rule-1',
        severity: 'high',
        type: 'query',
      },
    ];

    expect(res).toEqual({
      success: true,
      successCount: 1,
      errors: [],
      warnings: [],
      rulesWithMigratedActions,
    });
  });

  it('should import multiple rules with connectors successfully even if they were exported from different namespaces by generating destinationIds and replace the old actionIds with them', async () => {
    const multipleRules = [
      getImportRulesSchemaMock({
        rule_id: 'rule_1',
        actions: [
          {
            group: 'default',
            id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
            action_type_id: '.webhook',
            params: {},
          },
        ],
      }),
      getImportRulesSchemaMock({
        rule_id: 'rule_2',
        id: '0abc78e0-7031-11ed-b076-53cc4d57aaf1',
        actions: [
          {
            group: 'default',
            id: '11abc78e0-9031-11ed-b076-53cc4d57aaw',
            action_type_id: '.index',
            params: {},
          },
        ],
      }),
    ];
    const successResults = [
      {
        destinationId: '72cab9bb-535f-45dd-b9c2-5bc1bc0db96b',
        id: 'cabc78e0-9031-11ed-b076-53cc4d57aaf1',
        meta: { title: 'Connector: [anotherSpaceSlack]', icon: undefined },
        type: 'action',
      },
      {
        destinationId: '892cab9bb-535f-45dd-b9c2-5bc1bc0db96',
        id: '11abc78e0-9031-11ed-b076-53cc4d57aaw',
        meta: { title: 'Connector: [anotherSpaceSlack]', icon: undefined },
        type: 'action',
      },
    ];
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: jest.fn().mockResolvedValue({
        success: true,
        successCount: 1,
        successResults,
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter = core.savedObjects.getImporter;
    const actionConnectorsWithIndex = [
      ...actionConnectors,
      {
        id: '0abc78e0-7031-11ed-b076-53cc4d57aaf1',
        type: 'action',
        updated_at: '2023-01-25T14:35:52.852Z',
        created_at: '2023-01-25T14:35:52.852Z',
        version: 'WzUxNTksMV0=',
        attributes: {
          actionTypeId: '.webhook',
          name: 'webhook',
          isMissingSecrets: false,
          config: {},
          secrets: {},
        },
        references: [],
        migrationVersion: { action: '8.3.0' },
        coreMigrationVersion: '8.7.0',
      },
    ];
    actionsClient.getAll.mockResolvedValue([]);

    const res = await importRuleActionConnectors({
      actionConnectors: actionConnectorsWithIndex,
      actionsClient,
      actionsImporter: actionsImporter(),
      rules: multipleRules,
      overwrite: false,
    });
    const rulesWithMigratedActions = [
      {
        actions: [
          {
            action_type_id: '.webhook',
            group: 'default',
            id: '72cab9bb-535f-45dd-b9c2-5bc1bc0db96b',
            params: {},
          },
        ],
        description: 'some description',
        immutable: false,
        name: 'Query with a rule id',
        query: 'user.name: root or user.name: admin',
        risk_score: 55,
        rule_id: 'rule_1',
        severity: 'high',
        type: 'query',
      },
      {
        actions: [
          {
            action_type_id: '.index',
            group: 'default',
            id: '892cab9bb-535f-45dd-b9c2-5bc1bc0db96',
            params: {},
          },
        ],
        description: 'some description',
        immutable: false,
        name: 'Query with a rule id',
        id: '0abc78e0-7031-11ed-b076-53cc4d57aaf1',
        rule_id: 'rule_2',
        query: 'user.name: root or user.name: admin',
        risk_score: 55,
        severity: 'high',
        type: 'query',
      },
    ];

    expect(res).toEqual({
      success: true,
      successCount: 1,
      errors: [],
      warnings: [],
      rulesWithMigratedActions,
    });
  });

  describe('overwrite is set to "true"', () => {
    it('should return an error when action connectors are missing in ndjson import file', async () => {
      const rulesToImport = [
        getImportRulesSchemaMock({
          rule_id: 'rule-with-missed-action-connector',
          actions: [
            {
              group: 'default',
              id: 'some-connector-id',
              params: {},
              action_type_id: '.webhook',
            },
          ],
        }),
      ];

      actionsClient.getAll.mockResolvedValue([]);

      const res = await importRuleActionConnectors({
        actionConnectors: [],
        actionsClient,
        actionsImporter: core.savedObjects.getImporter(),
        rules: rulesToImport,
        overwrite: true,
      });

      expect(res).toEqual({
        success: false,
        successCount: 0,
        errors: [
          {
            error: {
              message: '1 connector is missing. Connector id missing is: some-connector-id',
              status_code: 404,
            },
            id: 'some-connector-id',
            rule_id: 'rule-with-missed-action-connector',
          },
        ],
        warnings: [],
      });
    });

    it('should NOT return an error when a missing action connector in ndjson import file is a preconfigured one', async () => {
      const rulesToImport = [
        getImportRulesSchemaMock({
          rule_id: 'rule-with-missed-action-connector',
          actions: [
            {
              group: 'default',
              id: 'prebuilt-connector-id',
              params: {},
              action_type_id: '.webhook',
            },
          ],
        }),
      ];

      actionsClient.getAll.mockResolvedValue([
        {
          actionTypeId: '.webhook',
          name: 'webhook',
          isPreconfigured: true,
          id: 'prebuilt-connector-id',
          referencedByCount: 1,
          isDeprecated: false,
          isSystemAction: false,
        },
      ]);

      const res = await importRuleActionConnectors({
        actionConnectors: [],
        actionsClient,
        actionsImporter: core.savedObjects.getImporter(),
        rules: rulesToImport,
        overwrite: true,
      });

      expect(res).toEqual({
        success: true,
        successCount: 0,
        errors: [],
        warnings: [],
      });
    });

    it('should not skip importing the action-connectors if all connectors have been imported/created before', async () => {
      const rulesToImport = [
        getImportRulesSchemaMock({
          actions: [
            {
              group: 'default',
              id: 'connector-id',
              action_type_id: '.webhook',
              params: {},
            },
          ],
        }),
      ];

      core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
        import: jest.fn().mockResolvedValue({
          success: true,
          successCount: 1,
          errors: [],
          warnings: [],
        }),
      });

      actionsClient.getAll.mockResolvedValue([
        {
          actionTypeId: '.webhook',
          name: 'webhook',
          isPreconfigured: true,
          id: 'connector-id',
          referencedByCount: 1,
          isDeprecated: false,
          isSystemAction: false,
        },
      ]);

      const res = await importRuleActionConnectors({
        actionConnectors,
        actionsClient,
        actionsImporter: core.savedObjects.getImporter(),
        rules: rulesToImport,
        overwrite: true,
      });

      expect(res).toEqual({
        success: true,
        successCount: 0,
        errors: [],
        warnings: [],
      });
    });
  });
});
