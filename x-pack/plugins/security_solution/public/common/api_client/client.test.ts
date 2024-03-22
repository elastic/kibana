/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCreateRulesSchemaMock,
  getRulesSchemaMock,
  getUpdateRulesSchemaMock,
} from '../../../common/api/detection_engine/model/rule_schema/mocks';
import { KibanaServices } from '../lib/kibana';
import { createRule, updateRule } from './client';

const mockKibanaServices = KibanaServices.get as jest.Mock;
jest.mock('../lib/kibana');

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
      await createRule(payload);
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
      await updateRule(payload);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/detection_engine/rules',
        expect.objectContaining({
          body: '{"description":"Detecting root and admin users","name":"Query with a rule id","query":"user.name: root or user.name: admin","severity":"high","type":"query","risk_score":55,"language":"kuery","id":"04128c15-0d1b-4716-a4c5-46997ac7f3bd"}',
          method: 'PUT',
        })
      );
    });
  });
});
