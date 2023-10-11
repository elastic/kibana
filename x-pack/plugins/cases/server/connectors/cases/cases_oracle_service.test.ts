/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';

import { CasesOracleService } from './cases_oracle_service';
import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';

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
      const groupingDefinition = 'host.ip=0.0.0.1';

      const payload = `${ruleId}:${spaceId}:${owner}:${groupingDefinition}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, groupingDefinition })).toEqual(hex);
    });

    it('sorts the grouping definition correctly', async () => {
      const ruleId = 'test-rule-id';
      const spaceId = 'default';
      const owner = 'cases';
      const groupingDefinition = 'host.ip=0.0.0.1&agent.id=8a4f500d';
      const sortedGroupingDefinition = 'agent.id=8a4f500d&host.ip=0.0.0.1';

      const payload = `${ruleId}:${spaceId}:${owner}:${sortedGroupingDefinition}`;
      const hash = createHash('sha256');

      hash.update(payload);

      const hex = hash.digest('hex');

      expect(service.getRecordId({ ruleId, spaceId, owner, groupingDefinition })).toEqual(hex);
    });
  });

  describe('getRecord', () => {
    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        caseIds: ['test-case-id'],
        ruleId: 'test-rule-id',
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

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id' });
    });
  });

  describe('createRecord', () => {
    const ruleId = 'test-rule-id';
    const spaceId = 'default';
    const owner = 'cases';
    const groupingDefinition = 'host.ip=0.0.0.1';
    const caseIds = ['test-case-id'];

    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        caseIds,
        ruleId,
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
      const record = await service.createRecord({
        ruleId,
        spaceId,
        owner,
        groupingDefinition,
        caseIds,
      });

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id' });
    });

    it('calls the unsecuredSavedObjectsClient.create method correctly', async () => {
      const keyParams = {
        ruleId,
        spaceId,
        owner,
        groupingDefinition,
      };

      const id = service.getRecordId(keyParams);

      await service.createRecord({
        ...keyParams,
        caseIds,
      });

      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
        'cases-oracle',
        {
          caseIds: ['test-case-id'],
          counter: 1,
          createdAt: expect.anything(),
          ruleId: 'test-rule-id',
          updatedAt: expect.anything(),
        },
        { id }
      );
    });
  });

  describe('increaseCounter', () => {
    const oracleSO = {
      id: 'so-id',
      version: 'so-version',
      attributes: {
        counter: 1,
        caseIds: ['test-case-id'],
        ruleId: 'test-rule-id',
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

      expect(record).toEqual({ ...oracleSO.attributes, id: 'so-id', counter: 2 });
    });

    it('calls the unsecuredSavedObjectsClient.update method correctly', async () => {
      await service.increaseCounter('so-id');

      expect(unsecuredSavedObjectsClient.update).toHaveBeenCalledWith('cases-oracle', 'so-id', {
        counter: 2,
      });
    });
  });
});
