/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEsQuery } from '@kbn/es-query';
import { KibanaServices } from '../../../common/lib/kibana';

import { DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL } from '../../../../common/detection_engine/rule_exceptions';
import { getPatchRulesSchemaMock } from '../../../../common/detection_engine/rule_management/mocks';
import {
  getCreateRulesSchemaMock,
  getUpdateRulesSchemaMock,
  getRulesSchemaMock,
} from '../../../../common/detection_engine/rule_schema/mocks';

import { rulesMock } from '../logic/mock';
import type { FindRulesReferencedByExceptionsListProp } from '../logic/types';

import {
  createRule,
  updateRule,
  patchRule,
  fetchRules,
  fetchRuleById,
  createPrepackagedRules,
  importRules,
  exportRules,
  fetchTags,
  getPrePackagedRulesStatus,
  previewRule,
  findRuleExceptionReferences,
} from './api';

const abortCtrl = new AbortController();
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
      await createRule({ rule: payload, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules', {
        body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","rule_id":"rule-1"}',
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
        body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","id":"04128c15-0d1b-4716-a4c5-46997ac7f3bd"}',
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

  describe('previewRule', () => {
    beforeEach(() => {
      fetchMock.mockClear();
      fetchMock.mockResolvedValue(getRulesSchemaMock());
    });

    test('POSTs rule', async () => {
      const payload = getCreateRulesSchemaMock();
      await previewRule({
        rule: { ...payload, invocationCount: 1, timeframeEnd: '2015-03-12 05:17:10' },
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/preview', {
        body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","rule_id":"rule-1","invocationCount":1,"timeframeEnd":"2015-03-12 05:17:10"}',
        method: 'POST',
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
          showCustomRules: false,
          showElasticRules: false,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter:
            '(alert.attributes.name: "hello world" OR alert.attributes.params.index: "hello world" OR alert.attributes.params.threat.tactic.id: "hello world" OR alert.attributes.params.threat.tactic.name: "hello world" OR alert.attributes.params.threat.technique.id: "hello world" OR alert.attributes.params.threat.technique.name: "hello world" OR alert.attributes.params.threat.technique.subtechnique.id: "hello world" OR alert.attributes.params.threat.technique.subtechnique.name: "hello world")',
          page: 1,
          per_page: 20,
          sort_field: 'enabled',
          sort_order: 'desc',
        },
        signal: abortCtrl.signal,
      });
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
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter:
            '(alert.attributes.name: "\\" OR (foo:bar)" OR alert.attributes.params.index: "\\" OR (foo:bar)" OR alert.attributes.params.threat.tactic.id: "\\" OR (foo:bar)" OR alert.attributes.params.threat.tactic.name: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.id: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.name: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.subtechnique.id: "\\" OR (foo:bar)" OR alert.attributes.params.threat.technique.subtechnique.name: "\\" OR (foo:bar)")',
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
          showCustomRules: true,
          showElasticRules: false,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.params.immutable: false',
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
          showCustomRules: false,
          showElasticRules: true,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.params.immutable: true',
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
          showCustomRules: false,
          showElasticRules: false,
          tags: ['hello', 'world'],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.tags:("hello" AND "world")',
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
          showCustomRules: false,
          showElasticRules: false,
          tags: ['hello', 'world'],
        },
        sortingOptions: {
          field: 'updated_at',
          order: 'desc',
        },
        signal: abortCtrl.signal,
      });

      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter: 'alert.attributes.tags:("hello" AND "world")',
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
          showCustomRules: true,
          showElasticRules: true,
          tags: [],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
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
          showCustomRules: true,
          showElasticRules: true,
          tags: ['"test"'],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
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
          showCustomRules: true,
          showElasticRules: true,
          tags: ['hello', 'world'],
        },
        sortingOptions: {
          field: 'enabled',
          order: 'desc',
        },
        signal: abortCtrl.signal,
      });
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/_find', {
        method: 'GET',
        query: {
          filter:
            'alert.attributes.tags:("hello" AND "world") AND (alert.attributes.name: "ruleName" OR alert.attributes.params.index: "ruleName" OR alert.attributes.params.threat.tactic.id: "ruleName" OR alert.attributes.params.threat.tactic.name: "ruleName" OR alert.attributes.params.threat.technique.id: "ruleName" OR alert.attributes.params.threat.technique.name: "ruleName" OR alert.attributes.params.threat.technique.subtechnique.id: "ruleName" OR alert.attributes.params.threat.technique.subtechnique.name: "ruleName")',
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
      await createPrepackagedRules();
      expect(fetchMock).toHaveBeenCalledWith('/api/detection_engine/rules/prepackaged', {
        method: 'PUT',
      });
    });
    test('happy path', async () => {
      const resp = await createPrepackagedRules();
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
      webkitRelativePath: '/webkitRelativePath',
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
          overwrite_exceptions: false,
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
          overwrite_exceptions: false,
        },
      });
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
      });
      const resp = await importRules({ fileToImport, signal: abortCtrl.signal });
      expect(resp).toEqual({
        success: true,
        success_count: 33,
        errors: [],
        rules_count: 33,
        exceptions_errors: [],
        exceptions_success: true,
        exceptions_success_count: 0,
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
      await findRuleExceptionReferences({ lists: payload, signal: abortCtrl.signal });
      expect(fetchMock).toHaveBeenCalledWith(DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL, {
        query: {
          ids: '123,456',
          list_ids: 'list_id_1,list_id_2',
          namespace_types: 'single,single',
        },
        method: 'GET',
        signal: abortCtrl.signal,
      });
    });
  });
});
