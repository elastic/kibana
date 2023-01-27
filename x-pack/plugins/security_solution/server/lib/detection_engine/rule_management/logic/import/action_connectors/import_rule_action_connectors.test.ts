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
const actionConnectors = [webHookConnector];
const actionsClient = actionsClientMock.create();
actionsClient.getBulk.mockResolvedValue([]);
const core = coreMock.createRequestHandlerContext();
core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
  import: () => ({
    success: true,
    successCount: 1,
    successResults: [],
    errors: [],
    warnings: [],
  }),
});
const actionsImporter = core.savedObjects.getImporter;

describe('checkRuleExceptionReferences', () => {
  it('should return import 1 connector successfully', async () => {
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
  it('should return import 2 connector successfully', async () => {
    core.savedObjects.getImporter = jest.fn().mockReturnValueOnce({
      import: () => ({
        success: true,
        successCount: 2,
        successResults: [],
        errors: [],
        warnings: [],
      }),
    });
    const actionsImporter2 = core.savedObjects.getImporter;
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
      actionsImporter: actionsImporter2() as never,
      rules: ruleWith2Connectors,
      overwrite: false,
    });

    expect(res).toEqual({
      success: true,
      successCount: 2,
      successResults: [],
      errors: [],
      warnings: [],
    });
  });
});
