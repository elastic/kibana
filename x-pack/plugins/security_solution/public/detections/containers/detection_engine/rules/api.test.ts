/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../../common/lib/kibana';
import {
  createRule,
  updateRule,
  patchRule,
  fetchRules,
  fetchRuleById,
  enableRules,
  deleteRules,
  duplicateRules,
  createPrepackagedRules,
  importRules,
  exportRules,
  getRuleStatusById,
  fetchTags,
  getPrePackagedRulesStatus,
} from './api';
import { getRulesSchemaMock } from '../../../../../common/detection_engine/schemas/response/rules_schema.mocks';
import {
  getCreateRulesSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../../../common/detection_engine/schemas/request/rule_schemas.mock';
import { getPatchRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/patch_rules_schema.mock';
import { rulesMock } from './mock';
import { buildEsQuery } from 'src/plugins/data/common';
const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../../common/lib/kibana');

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
      await createRule({ rule: payload, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        body:
          '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","rule_id":"rule-1"}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('updateRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('PUTs rule', async () => {
      const payload = getUpdateRulesSchemaMock();
      await updateRule({ rule: payload, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        body:
          '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","id":"04128c15-0d1b-4716-a4c5-46997ac7f3bd"}',
        method: 'PUT',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('patchRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('PATCHs rule', async () => {
      const payload = getPatchRulesSchemaMock();
      await patchRule({ ruleProperties: payload, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        body: JSON.stringify(payload),
        method: 'PATCH',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('fetchRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(rulesMock);
    });

    test('check parameter url, query without any options', async () => {
      await fetchRules({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, query with a filter', async () => {
      await fetchRules({
        filterOptions: {
          filter: 'hello world',
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: false,
          showElasticRules: false,
          tags: [],
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.name: hello world',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, query with showCustomRules', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: true,
          showElasticRules: false,
          tags: [],
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.tags: "__internal_immutable:false"',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, query with showElasticRules', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: false,
          showElasticRules: true,
          tags: [],
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.tags: "__internal_immutable:true"',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, query with tags', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: false,
          showElasticRules: false,
          tags: ['hello', 'world'],
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.tags: "hello" AND alert.attributes.tags: "world"',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('check parameter url, passed sort field is snake case', async () => {
      await fetchRules({
        filterOptions: {
          filter: '',
          sortField: 'updated_at',
          sortOrder: 'desc',
          showCustomRules: false,
          showElasticRules: false,
          tags: ['hello', 'world'],
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.tags: "hello" AND alert.attributes.tags: "world"',
          page: 1,
          per_page: 20,
          sort_field: 'updatedAt',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('query with tags KQL parses without errors when tags contain characters such as left parenthesis (', async () => {
      await fetchRules({
        filterOptions: {
          filter: 'ruleName',
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: true,
          showElasticRules: true,
          tags: ['('],
        },
        signal: abortCtrl.signal,
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
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: true,
          showElasticRules: true,
          tags: [],
        },
        signal: abortCtrl.signal,
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
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: true,
          showElasticRules: true,
          tags: ['"test"'],
        },
        signal: abortCtrl.signal,
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
          sortField: 'enabled',
          sortOrder: 'desc',
          showCustomRules: true,
          showElasticRules: true,
          tags: ['hello', 'world'],
        },
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter:
            'alert.attributes.name: ruleName AND alert.attributes.tags: "__internal_immutable:false" AND alert.attributes.tags: "__internal_immutable:true" AND (alert.attributes.tags: "hello" AND alert.attributes.tags: "world")',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const rulesResp = await fetchRules({ signal: abortCtrl.signal });
      expect(rulesResp).toEqual(rulesMock);
    });
  });

  describe('fetchRuleById', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('check parameter url, query', async () => {
      await fetchRuleById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        query: {
          id: 'mySuperRuleId',
        },
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const ruleResp = await fetchRuleById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(ruleResp).toEqual(getRulesSchemaMock());
    });
  });

  describe('enableRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(rulesMock);
    });

    test('check parameter url, body when enabling rules', async () => {
      await enableRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'], enabled: true });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_update', {
        body: '[{"id":"mySuperRuleId","enabled":true},{"id":"mySuperRuleId_II","enabled":true}]',
        method: 'PATCH',
      });
    });
    test('check parameter url, body when disabling rules', async () => {
      await enableRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'], enabled: false });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_update', {
        body: '[{"id":"mySuperRuleId","enabled":false},{"id":"mySuperRuleId_II","enabled":false}]',
        method: 'PATCH',
      });
    });
    test('happy path', async () => {
      const ruleResp = await enableRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        enabled: true,
      });
      expect(ruleResp).toEqual(rulesMock);
    });
  });

  describe('deleteRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(rulesMock);
    });

    test('check parameter url, body when deleting rules', async () => {
      await deleteRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'] });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_delete', {
        body: '[{"id":"mySuperRuleId"},{"id":"mySuperRuleId_II"}]',
        method: 'POST',
      });
    });

    test('happy path', async () => {
      const ruleResp = await deleteRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(ruleResp).toEqual(rulesMock);
    });
  });

  describe('duplicateRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(rulesMock);
    });

    test('check parameter url, body when duplicating rules', async () => {
      await duplicateRules({ rules: rulesMock.data });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_create', {
        body:
          '[{"actions":[],"author":[],"description":"Elastic Endpoint detected Credential Dumping. Click the Elastic Endpoint icon in the event.module column or the link in the rule.reference column in the External Alerts tab of the SIEM Detections page for additional information.","enabled":false,"false_positives":[],"from":"now-660s","index":["endgame-*"],"interval":"10m","language":"kuery","output_index":".siem-signals-default","max_signals":100,"risk_score":73,"risk_score_mapping":[],"name":"Credential Dumping - Detected - Elastic Endpoint [Duplicate]","query":"event.kind:alert and event.module:endgame and event.action:cred_theft_event and endgame.metadata.type:detection","filters":[],"references":[],"severity":"high","severity_mapping":[],"tags":["Elastic","Endpoint"],"to":"now","type":"query","threat":[],"throttle":null,"version":1},{"actions":[],"author":[],"description":"Elastic Endpoint detected an Adversary Behavior. Click the Elastic Endpoint icon in the event.module column or the link in the rule.reference column in the External Alerts tab of the SIEM Detections page for additional information.","enabled":false,"false_positives":[],"from":"now-660s","index":["endgame-*"],"interval":"10m","language":"kuery","output_index":".siem-signals-default","max_signals":100,"risk_score":47,"risk_score_mapping":[],"name":"Adversary Behavior - Detected - Elastic Endpoint [Duplicate]","query":"event.kind:alert and event.module:endgame and event.action:rules_engine_event","filters":[],"references":[],"severity":"medium","severity_mapping":[],"tags":["Elastic","Endpoint"],"to":"now","type":"query","threat":[],"throttle":null,"version":1}]',
        method: 'POST',
      });
    });

    test('check duplicated rules are disabled by default', async () => {
      await duplicateRules({ rules: rulesMock.data.map((rule) => ({ ...rule, enabled: true })) });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [path, options] = fetchMock.mock.calls[0];
      expect(path).toBe('/api/detection_engine/rules/_bulk_create');
      const rules = JSON.parse(options.body);
      expect(rules).toMatchObject([{ enabled: false }, { enabled: false }]);
    });

    test('happy path', async () => {
      const ruleResp = await duplicateRules({ rules: rulesMock.data });
      expect(ruleResp).toEqual(rulesMock);
    });
  });

  describe('createPrepackagedRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue({
        rules_installed: 0,
        rules_updated: 0,
        timelines_installed: 0,
        timelines_updated: 0,
      });
    });

    test('check parameter url when creating pre-packaged rules', async () => {
      await createPrepackagedRules({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/prepackaged', {
        signal: abortCtrl.signal,
        method: 'PUT',
      });
    });
    test('happy path', async () => {
      const resp = await createPrepackagedRules({ signal: abortCtrl.signal });
      expect(resp).toEqual({
        rules_installed: 0,
        rules_updated: 0,
        timelines_installed: 0,
        timelines_updated: 0,
      });
    });
  });

  describe('importRules', () => {
    const fileToImport: File = {
      lastModified: 33,
      name: 'fileToImport',
      size: 89,
      type: 'json',
      arrayBuffer: jest.fn(),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
    } as File;
    const formData = new FormData();
    formData.append('file', fileToImport);

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue('unknown');
    });

    test('check parameter url, body and query when importing rules', async () => {
      await importRules({ fileToImport, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_import', {
        signal: abortCtrl.signal,
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': undefined,
        },
        query: {
          overwrite: false,
        },
      });
    });

    test('check parameter url, body and query when importing rules with overwrite', async () => {
      await importRules({ fileToImport, overwrite: true, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_import', {
        signal: abortCtrl.signal,
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': undefined,
        },
        query: {
          overwrite: true,
        },
      });
    });

    test('happy path', async () => {
      fetchMock.mockResolvedValue({
        success: true,
        success_count: 33,
        errors: [],
      });
      const resp = await importRules({ fileToImport, signal: abortCtrl.signal });
      expect(resp).toEqual({
        success: true,
        success_count: 33,
        errors: [],
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
    } as Blob;

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(blob);
    });

    test('check parameter url, body and query when exporting rules', async () => {
      await exportRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        signal: abortCtrl.signal,
        method: 'POST',
        body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
        query: {
          exclude_export_details: false,
          file_name: 'rules_export.ndjson',
        },
      });
    });

    test('check parameter url, body and query when exporting rules with excludeExportDetails', async () => {
      await exportRules({
        excludeExportDetails: true,
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        signal: abortCtrl.signal,
        method: 'POST',
        body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
        query: {
          exclude_export_details: true,
          file_name: 'rules_export.ndjson',
        },
      });
    });

    test('check parameter url, body and query when exporting rules with fileName', async () => {
      await exportRules({
        filename: 'myFileName.ndjson',
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        signal: abortCtrl.signal,
        method: 'POST',
        body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
        query: {
          exclude_export_details: false,
          file_name: 'myFileName.ndjson',
        },
      });
    });

    test('check parameter url, body and query when exporting rules with all options', async () => {
      await exportRules({
        excludeExportDetails: true,
        filename: 'myFileName.ndjson',
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        signal: abortCtrl.signal,
        method: 'POST',
        body: '{"objects":[{"rule_id":"mySuperRuleId"},{"rule_id":"mySuperRuleId_II"}]}',
        query: {
          exclude_export_details: true,
          file_name: 'myFileName.ndjson',
        },
      });
    });

    test('happy path', async () => {
      const resp = await exportRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(resp).toEqual(blob);
    });
  });

  describe('getRuleStatusById', () => {
    const statusMock = {
      myRule: {
        current_status: {
          alert_id: 'alertId',
          status_date: 'mm/dd/yyyyTHH:MM:sssz',
          status: 'succeeded',
          last_failure_at: null,
          last_success_at: 'mm/dd/yyyyTHH:MM:sssz',
          last_failure_message: null,
          last_success_message: 'it is a success',
        },
        failures: [],
      },
    };

    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(statusMock);
    });

    test('check parameter url, query', async () => {
      await getRuleStatusById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find_statuses', {
        body: '{"ids":["mySuperRuleId"]}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const ruleResp = await getRuleStatusById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(ruleResp).toEqual(statusMock);
    });
  });

  describe('fetchTags', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(['some', 'tags']);
    });

    test('check parameter url when fetching tags', async () => {
      await fetchTags({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/tags', {
        signal: abortCtrl.signal,
        method: 'GET',
      });
    });

    test('happy path', async () => {
      const resp = await fetchTags({ signal: abortCtrl.signal });
      expect(resp).toEqual(['some', 'tags']);
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
      await getPrePackagedRulesStatus({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/prepackaged/_status', {
        signal: abortCtrl.signal,
        method: 'GET',
      });
    });
    test('happy path', async () => {
      const resp = await getPrePackagedRulesStatus({ signal: abortCtrl.signal });
      expect(resp).toEqual(prePackagedRulesStatus);
    });
  });
});
