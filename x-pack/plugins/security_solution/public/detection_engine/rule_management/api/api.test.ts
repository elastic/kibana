/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { KibanaServices } from '../../../common/lib/kibana';

import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../common/api/detection_engine/rule_exceptions';
import { getPatchRulesSchemaMock } from '../../../../common/api/detection_engine/rule_management/mocks';
import {
  getCreateRulesSchemaMock,
  getUpdateRulesSchemaMock,
  getRulesSchemaMock,
} from '../../../../common/api/detection_engine/model/rule_schema/mocks';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '../../../../common/api/detection_engine/rule_management';
import { rulesMock } from '../logic/mock';
import type { FindRulesReferencedByExceptionsListProp } from '../logic/types';

import {
  createRule,
  updateRule,
  patchRule,
  fetchRules,
  fetchRuleById,
  importRules,
  exportRules,
  getPrePackagedRulesStatus,
  previewRule,
  findRuleExceptionReferences,
  performBulkAction,
  fetchRulesSnoozeSettings,
} from './api';

const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Detections Rules API', () => {
  describe('createRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('POSTs rule', async () => {
      const payload = getCreateRulesSchemaMock();
      await createRule({ rule: payload });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules',
        expect.objectContaining({
          body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","rule_id":"rule-1"}',
          method: 'POST',
        })
      );
    });
  });

  describe('updateRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('PUTs rule', async () => {
      const payload = getUpdateRulesSchemaMock();
      await updateRule({ rule: payload });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules',
        expect.objectContaining({
          body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","id":"04128c15-0d1b-4716-a4c5-46997ac7f3bd"}',
          method: 'PUT',
        })
      );
    });
  });

  describe('patchRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('PATCHs rule', async () => {
      const payload = getPatchRulesSchemaMock();
      await patchRule({ ruleProperties: payload });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules',
        expect.objectContaining({
          body: JSON.stringify(payload),
          method: 'PATCH',
        })
      );
    });
  });

  describe('previewRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('POSTs rule', async () => {
      const payload = getCreateRulesSchemaMock();
      await previewRule({
        rule: { ...payload, invocationCount: 1, timeframeEnd: '2015-03-12 05:17:10' },
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/preview',
        expect.objectContaining({
          body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","rule_id":"rule-1","invocationCount":1,"timeframeEnd":"2015-03-12 05:17:10"}',
          method: 'POST',
        })
      );
    });
  });

  describe('fetchRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(rulesMock);
    });

    test('check parameter url, query without any options', async () => {
      await fetchRules({});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('check parameter url, query with a filter', async () => {
      await fetchRules({
        filterOptions: {
          filter: 'hello world',
          showCustomRules: false,
          showElasticRules: false,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter:
              '(alert.attributes.name: "hello world" OR alert.attributes.params.index: "hello world" OR alert.attributes.params.threat.tactic.id: "hello world" OR alert.attributes.params.threat.tactic.name: "hello world" OR alert.attributes.params.threat.technique.id: "hello world" OR alert.attributes.params.threat.technique.name: "hello world" OR alert.attributes.params.threat.technique.subtechnique.id: "hello world" OR alert.attributes.params.threat.technique.subtechnique.name: "hello world")',
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('check parameter url, query with a filter get escaped correctly', async () => {
      await fetchRules({
        filterOptions: {
          filter: '" OR (foo:bar)',
          showCustomRules: false,
          showElasticRules: false,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter:
              '(alert.attributes.name: "\\" OR (foo:bar)" OR alert.attributes.params.index: "\\" OR (foo:bar)" OR alert.attributes.params.threat.tactic.id: "\\" OR (foo:bar)" OR alert.attributes.params.threat.tactic.name: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.id: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.name: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.subtechnique.id: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.subtechnique.name: "\\" OR (foo:bar)")',
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('check parameter url, query with showCustomRules', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          showCustomRules: true,
          showElasticRules: false,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter: 'alert.attributes.params.immutable: false',
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('check parameter url, query with showElasticRules', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          showCustomRules: false,
          showElasticRules: true,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter: 'alert.attributes.params.immutable: true',
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('check parameter url, query with tags', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          showCustomRules: false,
          showElasticRules: false,
          tags: ['hello', 'world'],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter: 'alert.attributes.tags:("hello" AND "world")',
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('check parameter url, passed sort field is snake case', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          showCustomRules: false,
          showElasticRules: false,
          tags: ['hello', 'world'],
        },
        sortingOptions: {
          field: 'updatedAt',
          order: 'desc',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter: 'alert.attributes.tags:("hello" AND "world")',
            page: 1,
            per_page: 20,
            sort_field: 'updatedAt',
            sort_order: 'desc',
          },
        })
      );
    });

    test('query with tags KQL parses without errors when tags contain characters such as left parenthesis (', async () => {
      await fetchRules({
        filterOptions: {
          filter: 'ruleName',
          showCustomRules: true,
          showElasticRules: true,
          tags: ['('],
        },
      });
      const [
        [
          ,
          {
            query: { filter },
          },
        ],
      ] = fetchMock.mock.calls;
      expect(() => buildEsQuery(undefined, { query: filter, language: 'kuery' }, [])).not.toThrow();
    });

    test('query KQL parses without errors when filter contains characters such as double quotes', async () => {
      await fetchRules({
        filterOptions: {
          filter: '"test"',
          showCustomRules: true,
          showElasticRules: true,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });
      const [
        [
          ,
          {
            query: { filter },
          },
        ],
      ] = fetchMock.mock.calls;
      expect(() => buildEsQuery(undefined, { query: filter, language: 'kuery' }, [])).not.toThrow();
    });

    test('query KQL parses without errors when tags contains characters such as double quotes', async () => {
      await fetchRules({
        filterOptions: {
          filter: '"test"',
          showCustomRules: true,
          showElasticRules: true,
          tags: ['"test"'],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });
      const [
        [
          ,
          {
            query: { filter },
          },
        ],
      ] = fetchMock.mock.calls;
      expect(() => buildEsQuery(undefined, { query: filter, language: 'kuery' }, [])).not.toThrow();
    });

    test('check parameter url, query with all options', async () => {
      await fetchRules({
        filterOptions: {
          filter: 'ruleName',
          showCustomRules: true,
          showElasticRules: true,
          tags: ['hello', 'world'],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_find',
        expect.objectContaining({
          method: 'GET',
          query: {
            filter:
              '(alert.attributes.name: "ruleName" OR alert.attributes.params.index: "ruleName" OR alert.attributes.params.threat.tactic.id: "ruleName" OR alert.attributes.params.threat.tactic.name: "ruleName" OR alert.attributes.params.threat.technique.id: "ruleName" OR alert.attributes.params.threat.technique.name: "ruleName" OR alert.attributes.params.threat.technique.subtechnique.id: "ruleName" OR alert.attributes.params.threat.technique.subtechnique.name: "ruleName") AND alert.attributes.tags:("hello" AND "world")',
            page: 1,
            per_page: 20,
            sort_field: 'enabled',
            sort_order: 'desc',
          },
        })
      );
    });

    test('happy path', async () => {
      const rulesResp = await fetchRules({});
      expect(rulesResp).toEqual(rulesMock);
    });
  });

  describe('fetchRuleById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('check parameter url, query', async () => {
      await fetchRuleById({ id: 'mySuperRuleId' });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules',
        expect.objectContaining({
          query: {
            id: 'mySuperRuleId',
          },
          method: 'GET',
        })
      );
    });

    test('happy path', async () => {
      const ruleResp = await fetchRuleById({ id: 'mySuperRuleId' });
      expect(ruleResp).toEqual(getRulesSchemaMock());
    });
  });

  describe('importRules', () => {
    const fileToImport: File = {
      lastModified: 33,
      name: 'fileToImport',
      size: 89,
      type: 'json',
      webkitRelativePath: '/webkitRelativePath',
      arrayBuffer: jest.fn(),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
    } as unknown as File;
    const formData = new FormData();
    formData.append('file', fileToImport);

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue('unknown');
    });

    test('check parameter url, body and query when importing rules', async () => {
      await importRules({ fileToImport });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_import',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': undefined,
          },
          query: {
            overwrite: false,
            overwrite_action_connectors: false,
            overwrite_exceptions: false,
          },
        })
      );
    });

    test('check parameter url, body and query when importing rules with overwrite', async () => {
      await importRules({ fileToImport, overwrite: true });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_import',
        expect.objectContaining({
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': undefined,
          },
          query: {
            overwrite: true,
            overwrite_exceptions: false,
            overwrite_action_connectors: false,
          },
        })
      );
    });

    test('happy path', async () => {
      fetchMock.mockResolvedValue({
        success: true,
        success_count: 33,
        errors: [],
        rules_count: 33,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      });
      const resp = await importRules({ fileToImport });
      expect(resp).toEqual({
        success: true,
        success_count: 33,
        errors: [],
        rules_count: 33,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
        action_connectors_success: true,
        action_connectors_success_count: 0,
        action_connectors_errors: [],
        action_connectors_warnings: [],
      });
    });
  });

  describe('exportRules', () => {
    const blob: Blob = {
      size: 89,
      type: 'json',
      arrayBuffer: jest.fn(),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
    } as unknown as Blob;

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(blob);
    });

    test('check parameter url, body and query when exporting rules', async () => {
      await exportRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_export',
        expect.objectContaining({
          method: 'POST',
          body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
          query: {
            exclude_export_details: false,
            file_name: 'rules_export.ndjson',
          },
        })
      );
    });

    test('check parameter url, body and query when exporting rules with excludeExportDetails', async () => {
      await exportRules({
        excludeExportDetails: true,
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_export',
        expect.objectContaining({
          method: 'POST',
          body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
          query: {
            exclude_export_details: true,
            file_name: 'rules_export.ndjson',
          },
        })
      );
    });

    test('check parameter url, body and query when exporting rules with fileName', async () => {
      await exportRules({
        filename: 'myFileName.ndjson',
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_export',
        expect.objectContaining({
          method: 'POST',
          body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
          query: {
            exclude_export_details: false,
            file_name: 'myFileName.ndjson',
          },
        })
      );
    });

    test('check parameter url, body and query when exporting rules with all options', async () => {
      await exportRules({
        excludeExportDetails: true,
        filename: 'myFileName.ndjson',
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_export',
        expect.objectContaining({
          method: 'POST',
          body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
          query: {
            exclude_export_details: true,
            file_name: 'myFileName.ndjson',
          },
        })
      );
    });

    test('happy path', async () => {
      const resp = await exportRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(resp).toEqual(blob);
    });
  });

  describe('getPrePackagedRulesStatus', () => {
    const prePackagedRulesStatus = {
      rules_custom_installed: 33,
      rules_installed: 12,
      rules_not_installed: 0,
      rules_not_updated: 2,
    };
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(prePackagedRulesStatus);
    });
    test('check parameter url when fetching tags', async () => {
      await getPrePackagedRulesStatus({});
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/prepackaged/_status',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
    test('happy path', async () => {
      const resp = await getPrePackagedRulesStatus({});
      expect(resp).toEqual(prePackagedRulesStatus);
    });
  });

  describe('findRuleExceptionReferences', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('GETs exception references', async () => {
      const payload: FindRulesReferencedByExceptionsListProp[] = [
        {
          id: '123',
          listId: 'list_id_1',
          namespaceType: 'single',
        },
        {
          id: '456',
          listId: 'list_id_2',
          namespaceType: 'single',
        },
      ];
      await findRuleExceptionReferences({ lists: payload });
      expect(fetchMock).toHaveBeenCalledWith(
        DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL,
        expect.objectContaining({
          query: {
            ids: '123,456',
            list_ids: 'list_id_1,list_id_2',
            namespace_types: 'single,single',
          },
          method: 'GET',
        })
      );
    });
  });

  describe('performBulkAction', () => {
    const fetchMockResult = {};

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(fetchMockResult);
    });

    test('passes a query', async () => {
      await performBulkAction({
        bulkAction: { type: BulkActionTypeEnum.enable, query: 'some query' },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_bulk_action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'enable',
            query: 'some query',
          }),
          query: {
            dry_run: false,
          },
        })
      );
    });

    test('passes ids', async () => {
      await performBulkAction({
        bulkAction: { type: BulkActionTypeEnum.disable, ids: ['ruleId1', 'ruleId2'] },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_bulk_action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'disable',
            ids: ['ruleId1', 'ruleId2'],
          }),
          query: {
            dry_run: false,
          },
        })
      );
    });

    test('passes edit payload', async () => {
      await performBulkAction({
        bulkAction: {
          type: BulkActionTypeEnum.edit,
          ids: ['ruleId1'],
          editPayload: [
            { type: BulkActionEditTypeEnum.add_index_patterns, value: ['some-index-pattern'] },
          ],
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_bulk_action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'edit',
            ids: ['ruleId1'],
            edit: [{ type: 'add_index_patterns', value: ['some-index-pattern'] }],
          }),
          query: {
            dry_run: false,
          },
        })
      );
    });

    test('executes dry run', async () => {
      await performBulkAction({
        bulkAction: { type: BulkActionTypeEnum.disable, query: 'some query' },
        dryRun: true,
      });

      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules/_bulk_action',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'disable',
            query: 'some query',
          }),
          query: { dry_run: true },
        })
      );
    });

    test('returns result', async () => {
      const result = await performBulkAction({
        bulkAction: {
          type: BulkActionTypeEnum.disable,
          query: 'some query',
        },
      });

      expect(result).toBe(fetchMockResult);
    });
  });

  describe('fetchRulesSnoozeSettings', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue({
        data: [],
      });
    });

    test('requests snooze settings of multiple rules by their IDs', () => {
      fetchRulesSnoozeSettings({ ids: ['id1', 'id2'] });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({
            filter: 'alert.id:"alert:id1" or alert.id:"alert:id2"',
          }),
        })
      );
    });

    test('requests the same number of rules as the number of ids provided', () => {
      fetchRulesSnoozeSettings({ ids: ['id1', 'id2'] });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({
            per_page: 2,
          }),
        })
      );
    });

    test('requests only snooze settings fields', () => {
      fetchRulesSnoozeSettings({ ids: ['id1', 'id2'] });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({
            fields: JSON.stringify([
              'muteAll',
              'activeSnoozes',
              'isSnoozedUntil',
              'snoozeSchedule',
            ]),
          }),
        })
      );
    });

    test('returns mapped data', async () => {
      fetchMock.mockResolvedValue({
        data: [
          {
            id: '1',
            mute_all: false,
          },
          {
            id: '2',
            mute_all: false,
            active_snoozes: [],
            is_snoozed_until: '2023-04-24T19:31:46.765Z',
          },
        ],
      });

      const result = await fetchRulesSnoozeSettings({ ids: ['1', '2'] });

      expect(result).toEqual({
        '1': {
          muteAll: false,
          activeSnoozes: [],
        },
        '2': {
          muteAll: false,
          activeSnoozes: [],
          isSnoozedUntil: new Date('2023-04-24T19:31:46.765Z'),
        },
      });
    });
  });
});
