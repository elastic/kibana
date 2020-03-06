/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaServices } from '../../../lib/kibana';
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
import { ToasterErrors } from '../../../components/ml/api/throw_if_not_ok';

const abortCtrl = new AbortController();
const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../../../lib/kibana');

const mockfetchSuccess = (body: unknown, fetchMock?: jest.Mock) => {
  if (fetchMock) {
    mockKibanaServices.mockImplementation(() => ({
      http: {
        fetch: fetchMock,
      },
    }));
  } else {
    mockKibanaServices.mockImplementation(() => ({
      http: {
        fetch: () => ({
          response: {
            ok: true,
            message: 'success',
            text: 'success',
          },
          body,
        }),
      },
    }));
  }
};

const mockfetchError = () => {
  mockKibanaServices.mockImplementation(() => ({
    http: {
      fetch: () => ({
        response: {
          ok: false,
          text: () =>
            JSON.stringify({
              message: 'super mega error, it is not that bad',
            }),
        },
        body: null,
      }),
    },
  }));
};

describe('Detections Rules API', () => {
  const fetchMock = jest.fn();
  describe('addRule', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, body', async () => {
      mockfetchSuccess(null, fetchMock);

      await addRule({ rule: ruleMock, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        asResponse: true,
        body:
          '{"description":"some desc","enabled":true,"false_positives":[],"filters":[],"from":"now-360s","index":["apm-*-transaction*","auditbeat-*","endgame-*","filebeat-*","packetbeat-*","winlogbeat-*"],"interval":"5m","rule_id":"bbd3106e-b4b5-4d7c-a1a2-47531d6a2baf","language":"kuery","risk_score":75,"name":"Test rule","query":"user.email: \'root@elastic.co\'","references":[],"severity":"high","tags":["APM"],"to":"now","type":"query","threat":[]}',
        method: 'POST',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(ruleMock);
      const ruleResp = await addRule({ rule: ruleMock, signal: abortCtrl.signal });
      expect(ruleResp).toEqual(ruleMock);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await addRule({ rule: ruleMock, signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('fetchRules', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: rulesMock,
      }));
    });

    test('check parameter url, query without any options', async () => {
      mockfetchSuccess(null, fetchMock);

      await fetchRules({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);

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
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);

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
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);

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
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);

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
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);

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
        asResponse: true,
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
      mockfetchSuccess(rulesMock);

      const rulesResp = await fetchRules({ signal: abortCtrl.signal });
      expect(rulesResp).toEqual(rulesMock);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await fetchRules({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('fetchRuleById', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, query', async () => {
      mockfetchSuccess(null, fetchMock);

      await fetchRuleById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        asResponse: true,
        query: {
          id: 'mySuperRuleId',
        },
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(ruleMock);
      const ruleResp = await fetchRuleById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(ruleResp).toEqual(ruleMock);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await fetchRuleById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('enableRules', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, body when enabling rules', async () => {
      mockfetchSuccess(null, fetchMock);

      await enableRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'], enabled: true });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_update', {
        asResponse: true,
        body: '[{"id":"mySuperRuleId","enabled":true},{"id":"mySuperRuleId_II","enabled":true}]',
        method: 'PATCH',
      });
    });
    test('check parameter url, body when disabling rules', async () => {
      mockfetchSuccess(null, fetchMock);

      await enableRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'], enabled: false });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_update', {
        asResponse: true,
        body: '[{"id":"mySuperRuleId","enabled":false},{"id":"mySuperRuleId_II","enabled":false}]',
        method: 'PATCH',
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(rulesMock.data);
      const ruleResp = await enableRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
        enabled: true,
      });
      expect(ruleResp).toEqual(rulesMock.data);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await enableRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'], enabled: true });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('deleteRules', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, body when deleting rules', async () => {
      mockfetchSuccess(null, fetchMock);

      await deleteRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'] });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_delete', {
        asResponse: true,
        body: '[{"id":"mySuperRuleId"},{"id":"mySuperRuleId_II"}]',
        method: 'DELETE',
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(ruleMock);
      const ruleResp = await deleteRules({
        ids: ['mySuperRuleId', 'mySuperRuleId_II'],
      });
      expect(ruleResp).toEqual(ruleMock);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await deleteRules({ ids: ['mySuperRuleId', 'mySuperRuleId_II'] });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('duplicateRules', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, body when duplicating rules', async () => {
      mockfetchSuccess(null, fetchMock);

      await duplicateRules({ rules: rulesMock.data });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_bulk_create', {
        asResponse: true,
        body:
          '[{"description":"Elastic Endpoint detected Credential Dumping. Click the Elastic Endpoint icon in the event.module column or the link in the rule.reference column in the External Alerts tab of the SIEM Detections page for additional information.","enabled":false,"false_positives":[],"from":"now-660s","index":["endgame-*"],"interval":"10m","language":"kuery","output_index":".siem-signals-default","max_signals":100,"risk_score":73,"name":"Credential Dumping - Detected - Elastic Endpoint [Duplicate]","query":"event.kind:alert and event.module:endgame and event.action:cred_theft_event and endgame.metadata.type:detection","filters":[],"references":[],"severity":"high","tags":["Elastic","Endpoint"],"to":"now","type":"query","threat":[],"version":1},{"description":"Elastic Endpoint detected an Adversary Behavior. Click the Elastic Endpoint icon in the event.module column or the link in the rule.reference column in the External Alerts tab of the SIEM Detections page for additional information.","enabled":false,"false_positives":[],"from":"now-660s","index":["endgame-*"],"interval":"10m","language":"kuery","output_index":".siem-signals-default","max_signals":100,"risk_score":47,"name":"Adversary Behavior - Detected - Elastic Endpoint [Duplicate]","query":"event.kind:alert and event.module:endgame and event.action:rules_engine_event","filters":[],"references":[],"severity":"medium","tags":["Elastic","Endpoint"],"to":"now","type":"query","threat":[],"version":1}]',
        method: 'POST',
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(rulesMock.data);
      const ruleResp = await duplicateRules({ rules: rulesMock.data });
      expect(ruleResp).toEqual(rulesMock.data);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await duplicateRules({ rules: rulesMock.data });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('createPrepackagedRules', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url when creating pre-packaged rules', async () => {
      mockfetchSuccess(null, fetchMock);

      await createPrepackagedRules({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/prepackaged', {
        asResponse: true,
        signal: abortCtrl.signal,
        method: 'PUT',
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(true);
      const resp = await createPrepackagedRules({ signal: abortCtrl.signal });
      expect(resp).toEqual(true);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await createPrepackagedRules({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
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
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, body and query when importing rules', async () => {
      mockfetchSuccess(null, fetchMock);
      await importRules({ fileToImport, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_import', {
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);

      await importRules({ fileToImport, overwrite: true, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_import', {
        asResponse: true,
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
      mockfetchSuccess({
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

    test('unhappy path', async () => {
      mockfetchError();
      try {
        await importRules({ fileToImport, signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('exportRules', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });

    test('check parameter url, body and query when exporting rules', async () => {
      mockfetchSuccess(null, fetchMock);
      await exportRules({
        ruleIds: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);
      await exportRules({
        excludeExportDetails: true,
        ruleIds: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);
      await exportRules({
        filename: 'myFileName.ndjson',
        ruleIds: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        asResponse: true,
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
      mockfetchSuccess(null, fetchMock);
      await exportRules({
        excludeExportDetails: true,
        filename: 'myFileName.ndjson',
        ruleIds: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_export', {
        asResponse: true,
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
      const blob: Blob = {
        size: 89,
        type: 'json',
        arrayBuffer: jest.fn(),
        slice: jest.fn(),
        stream: jest.fn(),
        text: jest.fn(),
      } as Blob;
      mockfetchSuccess(blob);
      const resp = await exportRules({
        ruleIds: ['mySuperRuleId', 'mySuperRuleId_II'],
        signal: abortCtrl.signal,
      });
      expect(resp).toEqual(blob);
    });

    test('unhappy path', async () => {
      mockfetchError();
      try {
        await exportRules({
          ruleIds: ['mySuperRuleId', 'mySuperRuleId_II'],
          signal: abortCtrl.signal,
        });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('getRuleStatusById', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url, query', async () => {
      mockfetchSuccess(null, fetchMock);

      await getRuleStatusById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find_statuses', {
        asResponse: true,
        query: {
          ids: '["mySuperRuleId"]',
        },
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });
    test('happy path', async () => {
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
      mockfetchSuccess(statusMock);
      const ruleResp = await getRuleStatusById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      expect(ruleResp).toEqual(statusMock);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await getRuleStatusById({ id: 'mySuperRuleId', signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('fetchTags', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url when fetching tags', async () => {
      mockfetchSuccess(null, fetchMock);

      await fetchTags({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/tags', {
        asResponse: true,
        signal: abortCtrl.signal,
        method: 'GET',
      });
    });
    test('happy path', async () => {
      mockfetchSuccess(['hello', 'tags']);
      const resp = await fetchTags({ signal: abortCtrl.signal });
      expect(resp).toEqual(['hello', 'tags']);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await fetchTags({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });

  describe('getPrePackagedRulesStatus', () => {
    beforeEach(() => {
      mockKibanaServices.mockClear();
      fetchMock.mockClear();
      fetchMock.mockImplementation(() => ({
        response: {
          ok: true,
          message: 'success',
          text: 'success',
        },
        body: ruleMock,
      }));
    });
    test('check parameter url when fetching tags', async () => {
      mockfetchSuccess(null, fetchMock);

      await getPrePackagedRulesStatus({ signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/prepackaged/_status', {
        asResponse: true,
        signal: abortCtrl.signal,
        method: 'GET',
      });
    });
    test('happy path', async () => {
      const prePackagesRulesStatus = {
        rules_custom_installed: 33,
        rules_installed: 12,
        rules_not_installed: 0,
        rules_not_updated: 2,
      };
      mockfetchSuccess(prePackagesRulesStatus);
      const resp = await getPrePackagedRulesStatus({ signal: abortCtrl.signal });
      expect(resp).toEqual(prePackagesRulesStatus);
    });
    test('unhappy path', async () => {
      mockfetchError();
      try {
        await getPrePackagedRulesStatus({ signal: abortCtrl.signal });
      } catch (exp) {
        expect(exp).toBeInstanceOf(ToasterErrors);
        expect(exp.message).toEqual('super mega error, it is not that bad');
      }
    });
  });
});
