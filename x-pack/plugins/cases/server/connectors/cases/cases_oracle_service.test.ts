/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import stringify from 'json-stable-stringify';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { CasesOracleService } from './cases_oracle_service';
import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';
import { isEmpty, set } from 'lodash';

describe('CasesOracleService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();

  let service: CasesOracleService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CasesOracleService({ unsecuredSavedObjectsClient, log: mockLogger });
  });

  describe('getRecordId', () => {
    it('return the record ID correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1' };

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });

    it('sorts the grouping definition correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };
      const sortedGrouping = { 'agent.id': '8a4f500d', 'host.ip': '0.0.0.1' };

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(sortedGrouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });

    it('return the record ID correctly without grouping', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';

      const payload = `${ruleId}:${spaceId}:${owner}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner })).toEqual(hex);
    });

    it('return the record ID correctly with empty grouping', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = {};

      const payload = `${ruleId}:${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, grouping })).toEqual(hex);
    });

    it('return the record ID correctly without rule', async () => {
      const spaceId = 'default';
      const owner = 'cases';
      const grouping = { 'host.ip': '0.0.0.1' };

      const payload = `${spaceId}:${owner}:${stringify(grouping)}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ spaceId, owner, grouping })).toEqual(hex);
    });

    it('throws an error when the ruleId and the grouping is missing', async () => {
      const spaceId = 'default';
      const owner = 'cases';

      // @ts-expect-error: ruleId and grouping are omitted for testing
      expect(() => service.getRecordId({ spaceId, owner })).toThrowErrorMatchingInlineSnapshot(
        `"ruleID or grouping is required"`
      );
    });

    it.each(['ruleId', 'spaceId', 'owner'])(
      'return the record ID correctly with empty string for %s',
      async (key) => {
        const getPayloadValue = (value: string) => (isEmpty(value) ? '' : `${value}:`);

        const params = {
          ruleId: 'test-rule-id',
          spaceId: 'default',
          owner: 'cases',
        };

        const grouping = { 'host.ip': '0.0.0.1' };

        set(params, key, '');

        const payload = `${getPayloadValue(params.ruleId)}${getPayloadValue(
          params.spaceId
        )}${getPayloadValue(params.owner)}${stringify(grouping)}`;

        const hash = createHash('sha256');

        hash.update(payload);

        const hex = hash.digest('hex');

        expect(service.getRecordId({ ...params, grouping })).toEqual(hex);
      }
    );
  });

  describe('getRecord', () => {
    const cases = [{ id: 'test-case-id' }];
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        cases,
        rules,
        grouping,
        createdAt: '2023-10-10T10:23:42.769Z',
        updatedAt: '2023-10-10T10:23:42.769Z',
      },
      type: CASE_ORACLE_SAVED_OBJECT,
      references: [],
    };

    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValue(oracleSO);
    });

    it('gets a record correctly', async () => {
      const record = await service.getRecord('so-id');

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id', version: 'so-version' });
    });
  });

  describe('createRecord', () => {
    const cases = [{ id: 'test-case-id' }];
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        cases,
        rules,
        grouping,
        createdAt: '2023-10-10T10:23:42.769Z',
        updatedAt: '2023-10-10T10:23:42.769Z',
      },
      type: CASE_ORACLE_SAVED_OBJECT,
      references: [],
    };

    beforeEach(() => {
      unsecuredSavedObjectsClient.create.mockResolvedValue(oracleSO);
    });

    it('creates a record correctly', async () => {
      const record = await service.createRecord('so-id', { cases, rules, grouping });

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id', version: 'so-version' });
    });

    it('calls the unsecuredSavedObjectsClient.create method correctly', async () => {
      const id = 'so-id';

      await service.createRecord(id, { cases, rules, grouping });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'cases-oracle',
        {
          cases,
          counter: 1,
          createdAt: expect.anything(),
          rules,
          grouping,
          updatedAt: null,
        },
        { id }
      );
    });
  });

  describe('increaseCounter', () => {
    const cases = [{ id: 'test-case-id' }];
    const rules = [{ id: 'test-rule-id' }];
    const grouping = { 'host.ip': '0.0.0.1', 'agent.id': '8a4f500d' };

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        cases,
        rules,
        grouping,
        createdAt: '2023-10-10T10:23:42.769Z',
        updatedAt: '2023-10-10T10:23:42.769Z',
      },
      type: CASE_ORACLE_SAVED_OBJECT,
      references: [],
    };

    const oracleSOWithIncreasedCounter = {
      ...oracleSO,
      attributes: { ...oracleSO.attributes, counter: 2 },
    };

    beforeEach(() => {
      unsecuredSavedObjectsClient.get.mockResolvedValue(oracleSO);
      unsecuredSavedObjectsClient.update.mockResolvedValue(oracleSOWithIncreasedCounter);
    });

    it('increases the counter correctly', async () => {
      const record = await service.increaseCounter('so-id');

      expect(record).toEqual({
        ...oracleSO.attributes,
        id: 'so-id',
        version: 'so-version',
        counter: 2,
      });
    });

    it('calls the unsecuredSavedObjectsClient.update method correctly', async () => {
      await service.increaseCounter('so-id');

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith(
        'cases-oracle',
        'so-id',
        {
          counter: 2,
        },
        { version: 'so-version' }
      );
    });
  });
});
