/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';
import { CryptoService } from './crypto_service';
import type { OracleKey, OracleRecord } from './types';

type OracleRecordWithoutId = Omit<OracleRecord, 'id'>;

export class CasesOracleService {
  private readonly log: Logger;
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private cryptoService: CryptoService;

  constructor({
    log,
    unsecuredSavedObjectsClient,
  }: {
    log: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
  }) {
    this.log = log;
    this.unsecuredSavedObjectsClient = unsecuredSavedObjectsClient;
    this.cryptoService = new CryptoService();
  }

  public getRecordId({ ruleId, spaceId, owner, groupingDefinition }: OracleKey): string {
    const payload = `${ruleId}:${spaceId}:${owner}:${groupingDefinition}`;

    return this.cryptoService.getHash(payload);
  }

  public async getRecord(recordId: string): Promise<OracleRecord> {
    this.log.debug(`Getting oracle record with ID: ${recordId}`);

    const oracleRecord = await this.unsecuredSavedObjectsClient.get<OracleRecordWithoutId>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId
    );

    return {
      id: oracleRecord.id,
      counter: oracleRecord.attributes.counter,
      caseIds: oracleRecord.attributes.caseIds,
      ruleId: oracleRecord.attributes.ruleId,
      createdAt: oracleRecord.attributes.createdAt,
      updatedAt: oracleRecord.attributes.updatedAt,
    };
  }
}
