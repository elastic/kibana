/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../../common/lib/kibana';
import {
  addRule,
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
import { ruleMock, rulesMock } from './mock';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../../common/lib/kibana');

const fetchMock = jest.fn();
mockKibanaServices.mockReturnValue({ http: { fetch: fetchMock } });

describe('Detections Rules API', () => {
  describe('addRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(ruleMock);
    });

    test('check parameter url, body', async () => {
      await addRule({ rule: ruleMock, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        body:
          '{"description":"some desc","enabled":true,"false_positives":[],"filters":[],"from":"now-360s","index":["apm-*-transaction*","auditbeat-*","endgame-*","filebeat-*","packetbeat-*","winlogbeat-*"],"interval":"5m","rule_id":"bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf","language":"kuery","risk_score":75,"name":"Test rule","query":"user.email: \'root@elastic.co\'","references":[],"severity":"high","tags":["APM"],"to":"now","type":"query","threat":[],"throttle":null}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });

    test('happy path', async () => {
      const ruleResp = await addRule({ rule: ruleMock, signal: abortCtrl.signal });
      expect(ruleResp).toEqual(ruleMock);
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
          filter: 'alert.attributes.tags: hello AND alert.attributes.tags: world',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
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
            'alert.attributes.name: ruleName AND alert.attributes.tags: "__internal_immutable:false" AND alert.attributes.tags: "__internal_immutable:true" AND alert.attributes.tags: hello AND alert.attributes.tags: world',
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
      fetchMock.mockResolvedValue(ruleMock);
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
      expect(ruleResp).toEqual(ruleMock);
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
        method: 'DELETE',
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

    test('happy path', async () => {
      const ruleResp = await duplicateRules({ rules: rulesMock.data });
      expect(ruleResp).toEqual(rulesMock);
    });
  });

  describe('createPrepackagedRules', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue('unknown');
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
      expect(resp).toEqual(true);
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
