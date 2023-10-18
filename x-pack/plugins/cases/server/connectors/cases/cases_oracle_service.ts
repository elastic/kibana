/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import { CASE_ORACLE_SAVED_OBJECT } from '../../../common/constants';
import type { SavedObjectsBulkResponseWithErrors } from '../../common/types';
import { isSOError } from '../../common/utils';
import { CryptoService } from './crypto_service';
import type {
  BulkGetRecordsResponse,
  OracleKey,
  OracleRecord,
  OracleRecordCreateRequest,
} from './types';
import { partitionRecords } from './utils';

type OracleRecordAttributes = Omit<OracleRecord, 'id' | 'version'>;
type BulkCreateRequest = Array<{
  recordId: string;
  payload: OracleRecordCreateRequest;
}>;

export class CasesOracleService {
  private readonly log: Logger;
  /**
   * TODO: Think about permissions etc.
   * Should we authorize based on the owner?
   */
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

    const oracleRecord = await this.unsecuredSavedObjectsClient.get<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async bulkGetRecords(ids: string[]): Promise<BulkGetRecordsResponse> {
    this.log.debug(`Getting oracle records with IDs: ${ids}`);

    const oracleRecords = (await this.unsecuredSavedObjectsClient.bulkGet<OracleRecordAttributes>(
      ids.map((id) => ({ id, type: CASE_ORACLE_SAVED_OBJECT }))
    )) as SavedObjectsBulkResponseWithErrors<OracleRecordAttributes>;

    return this.getBulkRecordsResponse(oracleRecords);
  }

  public async createRecord(
    recordId: string,
    payload: OracleRecordCreateRequest
  ): Promise<OracleRecord> {
    const { cases, rules, grouping } = payload;

    this.log.debug(`Creating oracle record with ID: ${recordId}`);

    const oracleRecord = await this.unsecuredSavedObjectsClient.create<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      {
        counter: 1,
        cases,
        rules,
        grouping,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
      { id: recordId }
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async bulkCreateRecord(records: BulkCreateRequest): Promise<BulkGetRecordsResponse> {
    const recordIds = records.map((record) => record.recordId);

    this.log.debug(`Creating oracle record with ID: ${recordIds}`);

    const req = records.map((record) => ({
      id: record.recordId,
      type: CASE_ORACLE_SAVED_OBJECT,
      attributes: {
        counter: 1,
        cases: record.payload.cases,
        rules: record.payload.rules,
        grouping: record.payload.grouping,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      },
    }));

    const oracleRecords =
      (await this.unsecuredSavedObjectsClient.bulkCreate<OracleRecordAttributes>(
        req
      )) as SavedObjectsBulkResponseWithErrors<OracleRecordAttributes>;

    return this.getBulkRecordsResponse(oracleRecords);
  }

  public async bulkGetOrCreateRecords(records: BulkCreateRequest): Promise<OracleRecord[]> {
    const recordsMap = new Map<string, OracleRecordCreateRequest>(
      records.map(({ recordId, payload }) => [recordId, payload])
    );
    const bulkCreateReq: BulkCreateRequest = [];

    const ids = records.map(({ recordId }) => recordId);

    const bulkGetRes = await this.bulkGetRecords(ids);
    const [bulkGetValidRecords, bulkGetRecordsErrors] = partitionRecords(bulkGetRes);

    for (const error of bulkGetRecordsErrors) {
      if (error.id && recordsMap.has(error.id)) {
        bulkCreateReq.push({
          recordId: error.id,
          payload: recordsMap.get(error.id) ?? { cases: [], rules: [], grouping: {} },
        });
      }
    }

    const bulkCreateRes = await this.bulkCreateRecord(bulkCreateReq);

    /**
     * TODO: Retry on errors
     */
    const [bulkCreateValidRecords, _] = partitionRecords(bulkCreateRes);

    return [...bulkGetValidRecords, ...bulkCreateValidRecords];
  }

  public async increaseCounter(recordId: string): Promise<OracleRecord> {
    const { id: _, version, ...record } = await this.getRecord(recordId);
    const newCounter = record.counter + 1;

    this.log.debug(
      `Increasing the counter of oracle record with ID: ${recordId} from ${record.counter} to ${newCounter}`
    );

    const oracleRecord = await this.unsecuredSavedObjectsClient.update<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId,
      { counter: newCounter },
      { version }
    );

    return this.getRecordResponse({
      ...oracleRecord,
      attributes: { ...record, counter: newCounter },
      references: oracleRecord.references ?? [],
    });
  }

  private getRecordResponse = (
    oracleRecord: SavedObject<OracleRecordAttributes>
  ): OracleRecord => ({
    id: oracleRecord.id,
    version: oracleRecord.version ?? '',
    counter: oracleRecord.attributes.counter,
    cases: oracleRecord.attributes.cases,
    grouping: oracleRecord.attributes.grouping,
    rules: oracleRecord.attributes.rules,
    createdAt: oracleRecord.attributes.createdAt,
    updatedAt: oracleRecord.attributes.updatedAt,
  });

  private getBulkRecordsResponse(
    oracleRecords: SavedObjectsBulkResponseWithErrors<OracleRecordAttributes>
  ): BulkGetRecordsResponse {
    return oracleRecords.saved_objects.map((oracleRecord) => {
      if (isSOError(oracleRecord)) {
        return { ...oracleRecord.error, id: oracleRecord.id };
      }

      return this.getRecordResponse(oracleRecord);
    });
  }
}
