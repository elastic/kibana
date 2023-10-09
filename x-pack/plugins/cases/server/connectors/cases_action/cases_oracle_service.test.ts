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

describe('CryptoService', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const mockLogger = loggerMock.create();

  let service: CasesOracleService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CasesOracleService({ unsecuredSavedObjectsClient, log: mockLogger });
  });

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
});
