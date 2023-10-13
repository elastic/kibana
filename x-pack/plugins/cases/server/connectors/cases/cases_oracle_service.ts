/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';
import { CryptoService } from './crypto_service';
import type { OracleKey, OracleRecord, OracleRecordCreateRequest } from './types';

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

  public getRecordId({ ruleId, spaceId, owner, grouping }: OracleKey): string {
    if (grouping == null && ruleId == null) {
      throw new Error('ruleID or grouping is required');
    }

    const payload = [
      ruleId,
      spaceId,
      owner,
      this.cryptoService.stringifyDeterministically(grouping),
    ]
      .filter(Boolean)
      .join(':');

    return this.cryptoService.getHash(payload);
  }

  public async getRecord(recordId: string): Promise<OracleRecord> {
    this.log.debug(`Getting oracle record with ID: ${recordId}`);

    const oracleRecord = await this.unsecuredSavedObjectsClient.get<OracleRecordWithoutId>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async createRecord(
    recordId: string,
    payload: OracleRecordCreateRequest
  ): Promise<OracleRecord> {
    const { cases, rules } = payload;

    this.log.debug(`Creating oracle record with ID: ${recordId}`);

    const oracleRecord = await this.unsecuredSavedObjectsClient.create<OracleRecordWithoutId>(
      CASE_ORACLE_SAVED_OBJECT,
      {
        counter: 1,
        cases,
        rules,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { id: recordId }
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async increaseCounter(recordId: string): Promise<OracleRecord> {
    const record = await this.getRecord(recordId);
    const newCounter = record.counter + 1;

    this.log.debug(
      `Increasing the counter of oracle record with ID: ${recordId} from ${record.counter} to ${newCounter}`
    );

    const oracleRecord = await this.unsecuredSavedObjectsClient.update<OracleRecordWithoutId>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId,
      { counter: newCounter }
    );

    return this.getRecordResponse({
      ...oracleRecord,
      attributes: { ...record, counter: newCounter },
      references: oracleRecord.references ?? [],
    });
  }

  private getRecordResponse = (oracleRecord: SavedObject<OracleRecordWithoutId>): OracleRecord => ({
    id: oracleRecord.id,
    counter: oracleRecord.attributes.counter,
    cases: oracleRecord.attributes.cases,
    rules: oracleRecord.attributes.rules,
    createdAt: oracleRecord.attributes.createdAt,
    updatedAt: oracleRecord.attributes.updatedAt,
  });
}
