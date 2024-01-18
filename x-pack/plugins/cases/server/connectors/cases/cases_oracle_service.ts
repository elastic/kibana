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
  BulkCreateOracleRecordRequest,
  BulkGetOracleRecordsResponse,
  BulkUpdateOracleRecordRequest,
  OracleKey,
  OracleRecord,
  OracleRecordAttributes,
  OracleRecordCreateRequest,
} from './types';

export class CasesOracleService {
  private readonly logger: Logger;
  /**
   * TODO: Think about permissions etc.
   * Should we authorize based on the owner?
   */
  private readonly unsecuredSavedObjectsClient: SavedObjectsClientContract;
  private cryptoService: CryptoService;

  constructor({
    logger,
    unsecuredSavedObjectsClient,
  }: {
    logger: Logger;
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
  }) {
    this.logger = logger;
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
    this.logger.debug(`Getting oracle record with ID: ${recordId}`, {
      tags: ['cases-oracle-service', 'getRecord', recordId],
    });

    const oracleRecord = await this.unsecuredSavedObjectsClient.get<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async bulkGetRecords(ids: string[]): Promise<BulkGetOracleRecordsResponse> {
    this.logger.debug(`Getting oracle records with IDs: ${ids}`, {
      tags: ['cases-oracle-service', 'bulkGetRecords', ...ids],
    });

    const oracleRecords = (await this.unsecuredSavedObjectsClient.bulkGet<OracleRecordAttributes>(
      ids.map((id) => ({ id, type: CASE_ORACLE_SAVED_OBJECT }))
    )) as SavedObjectsBulkResponseWithErrors<OracleRecordAttributes>;

    return this.getBulkRecordsResponse(oracleRecords);
  }

  public async createRecord(
    recordId: string,
    payload: OracleRecordCreateRequest
  ): Promise<OracleRecord> {
    this.logger.debug(`Creating oracle record with ID: ${recordId}`, {
      tags: ['cases-oracle-service', 'createRecord', recordId],
    });

    const oracleRecord = await this.unsecuredSavedObjectsClient.create<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      this.getCreateRecordAttributes(payload),
      { id: recordId }
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async bulkCreateRecord(
    records: BulkCreateOracleRecordRequest
  ): Promise<BulkGetOracleRecordsResponse> {
    const recordIds = records.map((record) => record.recordId);

    this.logger.debug(`Creating oracle record with ID: ${recordIds}`, {
      tags: ['cases-oracle-service', 'bulkCreateRecord', ...recordIds],
    });

    const req = records.map((record) => ({
      id: record.recordId,
      type: CASE_ORACLE_SAVED_OBJECT,
      attributes: this.getCreateRecordAttributes(record.payload),
    }));

    const oracleRecords =
      (await this.unsecuredSavedObjectsClient.bulkCreate<OracleRecordAttributes>(
        req
      )) as SavedObjectsBulkResponseWithErrors<OracleRecordAttributes>;

    return this.getBulkRecordsResponse(oracleRecords);
  }

  public async increaseCounter(recordId: string): Promise<OracleRecord> {
    const { id: _, version, ...record } = await this.getRecord(recordId);
    const newCounter = record.counter + 1;

    this.logger.debug(
      `Increasing the counter of oracle record with ID: ${recordId} from ${record.counter} to ${newCounter}`,
      {
        tags: ['cases-oracle-service', 'increaseCounter', recordId],
      }
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

  public async bulkUpdateRecord(
    records: BulkUpdateOracleRecordRequest
  ): Promise<BulkGetOracleRecordsResponse> {
    const recordIds = records.map((record) => record.recordId);

    this.logger.debug(`Updating oracle record with ID: ${recordIds}`, {
      tags: ['cases-oracle-service', 'bulkUpdateRecord', ...recordIds],
    });

    const req = records.map((record) => ({
      id: record.recordId,
      type: CASE_ORACLE_SAVED_OBJECT,
      version: record.version,
      attributes: { ...record.payload, updatedAt: new Date().toISOString() },
    }));

    const oracleRecords =
      (await this.unsecuredSavedObjectsClient.bulkUpdate<OracleRecordAttributes>(
        req
      )) as SavedObjectsBulkResponseWithErrors<OracleRecordAttributes>;

    return this.getBulkRecordsResponse(oracleRecords);
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
  ): BulkGetOracleRecordsResponse {
    return oracleRecords.saved_objects.map((oracleRecord) => {
      if (isSOError(oracleRecord)) {
        return { ...oracleRecord.error, id: oracleRecord.id };
      }

      return this.getRecordResponse(oracleRecord);
    });
  }

  private getCreateRecordAttributes({ cases, rules, grouping }: OracleRecordCreateRequest) {
    return {
      counter: 1,
      cases,
      rules,
      grouping,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
  }
}
