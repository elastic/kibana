/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import type {
  Logger,
  SavedObject,
  SavedObjectReference,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { CASE_ORACLE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import { isSODecoratedError, isSOError } from '../../common/error';
import type { SavedObjectsBulkResponseWithErrors } from '../../common/types';
import { INITIAL_ORACLE_RECORD_COUNTER } from './constants';
import { CryptoService } from './crypto_service';
import type {
  BulkCreateOracleRecordRequest,
  BulkGetOracleRecordsResponse,
  BulkUpdateOracleRecordRequest,
  OracleKey,
  OracleRecord,
  OracleRecordAttributes,
  OracleRecordCreateRequest,
  OracleRecordError,
  OracleSOError,
} from './types';

export class CasesOracleService {
  private readonly logger: Logger;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private cryptoService: CryptoService;

  constructor({
    logger,
    savedObjectsClient,
  }: {
    logger: Logger;
    savedObjectsClient: SavedObjectsClientContract;
  }) {
    this.logger = logger;
    this.savedObjectsClient = savedObjectsClient;
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

    const oracleRecord = await this.savedObjectsClient.get<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      recordId
    );

    return this.getRecordResponse(oracleRecord);
  }

  public async bulkGetRecords(ids: string[]): Promise<BulkGetOracleRecordsResponse> {
    this.logger.debug(`Getting oracle records with IDs: ${ids}`, {
      tags: ['cases-oracle-service', 'bulkGetRecords', ...ids],
    });

    if (ids.length === 0) {
      return [];
    }

    const oracleRecords = (await this.savedObjectsClient.bulkGet<OracleRecordAttributes>(
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

    const oracleRecord = await this.savedObjectsClient.create<OracleRecordAttributes>(
      CASE_ORACLE_SAVED_OBJECT,
      this.getCreateRecordAttributes(payload),
      { id: recordId, references: this.getCreateRecordReferences(payload) }
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

    if (records.length === 0) {
      return [];
    }

    const req = records.map((record) => ({
      id: record.recordId,
      type: CASE_ORACLE_SAVED_OBJECT,
      attributes: this.getCreateRecordAttributes(record.payload),
      references: this.getCreateRecordReferences(record.payload),
    }));

    const oracleRecords = (await this.savedObjectsClient.bulkCreate<OracleRecordAttributes>(
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

    const oracleRecord = await this.savedObjectsClient.update<OracleRecordAttributes>(
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

    if (records.length === 0) {
      return [];
    }

    const req = records.map((record) => ({
      id: record.recordId,
      type: CASE_ORACLE_SAVED_OBJECT,
      version: record.version,
      attributes: { ...record.payload, updatedAt: new Date().toISOString() },
    }));

    const oracleRecords = (await this.savedObjectsClient.bulkUpdate<OracleRecordAttributes>(
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
        return this.getErrorResponse(oracleRecord.id, oracleRecord.error);
      }

      return this.getRecordResponse(oracleRecord);
    });
  }

  private getErrorResponse(id: string, error: OracleSOError): OracleRecordError {
    if (isSODecoratedError(error)) {
      return {
        id,
        error: error.output.payload.error,
        message: error.output.payload.message,
        statusCode: error.output.statusCode,
      };
    }

    return {
      id,
      error: error.error,
      message: error.message,
      statusCode: error.statusCode,
    };
  }

  private getCreateRecordAttributes({ cases, rules, grouping }: OracleRecordCreateRequest) {
    return {
      counter: INITIAL_ORACLE_RECORD_COUNTER,
      cases,
      rules,
      grouping,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    };
  }

  private getCreateRecordReferences({
    cases,
    rules,
    grouping,
  }: OracleRecordCreateRequest): SavedObjectReference[] {
    const references = [];

    for (const rule of rules) {
      references.push({
        id: rule.id,
        type: RULE_SAVED_OBJECT_TYPE,
        name: `associated-${RULE_SAVED_OBJECT_TYPE}`,
      });
    }

    for (const theCase of cases) {
      references.push({
        id: theCase.id,
        type: CASE_SAVED_OBJECT,
        name: `associated-${CASE_SAVED_OBJECT}`,
      });
    }

    return references;
  }
}
