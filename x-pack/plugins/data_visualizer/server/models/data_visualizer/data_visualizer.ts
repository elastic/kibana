/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from 'kibana/server';
import { each, last } from 'lodash';
import { estypes } from '@elastic/elasticsearch';
import { JOB_FIELD_TYPES } from '../../../common';
import type {
  BatchStats,
  FieldData,
  HistogramField,
  Field,
  DocumentCountStats,
  FieldExamples,
} from '../../types';
import { getHistogramsForFields } from './get_histogram_for_fields';
import {
  checkAggregatableFieldsExist,
  checkNonAggregatableFieldExists,
} from './check_fields_exist';
import { AGGREGATABLE_EXISTS_REQUEST_BATCH_SIZE, FIELDS_REQUEST_BATCH_SIZE } from './constants';
import { getFieldExamples } from './get_field_examples';
import {
  getBooleanFieldsStats,
  getDateFieldsStats,
  getDocumentCountStats,
  getNumericFieldsStats,
  getStringFieldsStats,
} from './get_fields_stats';
import { wrapError } from '../../utils/error_wrapper';

export class DataVisualizer {
  private _client: IScopedClusterClient;

  constructor(client: IScopedClusterClient) {
    this._client = client;
  }

  // Obtains overall stats on the fields in the supplied index pattern, returning an object
  // containing the total document count, and four arrays showing which of the supplied
  // aggregatable and non-aggregatable fields do or do not exist in documents.
  // Sampling will be used if supplied samplerShardSize > 0.
  async getOverallStats(
    indexPatternTitle: string,
    query: object,
    aggregatableFields: string[],
    nonAggregatableFields: string[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    const stats = {
      totalCount: 0,
      aggregatableExistsFields: [] as FieldData[],
      aggregatableNotExistsFields: [] as FieldData[],
      nonAggregatableExistsFields: [] as FieldData[],
      nonAggregatableNotExistsFields: [] as FieldData[],
      errors: [] as any[],
    };

    // To avoid checking for the existence of too many aggregatable fields in one request,
    // split the check into multiple batches (max 200 fields per request).
    const batches: string[][] = [[]];
    each(aggregatableFields, (field) => {
      let lastArray: string[] = last(batches) as string[];
      if (lastArray.length === AGGREGATABLE_EXISTS_REQUEST_BATCH_SIZE) {
        lastArray = [];
        batches.push(lastArray);
      }
      lastArray.push(field);
    });

    await Promise.all(
      batches.map(async (fields) => {
        try {
          const batchStats = await this.checkAggregatableFieldsExist(
            indexPatternTitle,
            query,
            fields,
            samplerShardSize,
            timeFieldName,
            earliestMs,
            latestMs,
            undefined,
            runtimeMappings
          );

          // Total count will be returned with each batch of fields. Just overwrite.
          stats.totalCount = batchStats.totalCount;

          // Add to the lists of fields which do and do not exist.
          stats.aggregatableExistsFields.push(...batchStats.aggregatableExistsFields);
          stats.aggregatableNotExistsFields.push(...batchStats.aggregatableNotExistsFields);
        } catch (e) {
          // If index not found, no need to proceed with other batches
          if (e.statusCode === 404) {
            throw e;
          }
          stats.errors.push(wrapError(e));
        }
      })
    );

    await Promise.all(
      nonAggregatableFields.map(async (field) => {
        try {
          const existsInDocs = await this.checkNonAggregatableFieldExists(
            indexPatternTitle,
            query,
            field,
            timeFieldName,
            earliestMs,
            latestMs,
            runtimeMappings
          );

          const fieldData: FieldData = {
            fieldName: field,
            existsInDocs,
            stats: {},
          };

          if (existsInDocs === true) {
            stats.nonAggregatableExistsFields.push(fieldData);
          } else {
            stats.nonAggregatableNotExistsFields.push(fieldData);
          }
        } catch (e) {
          stats.errors.push(wrapError(e));
        }
      })
    );

    return stats;
  }

  // Obtains binned histograms for supplied list of fields. The statistics for each field in the
  // returned array depend on the type of the field (keyword, number, date etc).
  // Sampling will be used if supplied samplerShardSize > 0.
  async getHistogramsForFields(
    indexPatternTitle: string,
    query: any,
    fields: HistogramField[],
    samplerShardSize: number,
    runtimeMappings?: estypes.MappingRuntimeFields
  ): Promise<any> {
    return await getHistogramsForFields(
      this._client,
      indexPatternTitle,
      query,
      fields,
      samplerShardSize,
      runtimeMappings
    );
  }

  // Obtains statistics for supplied list of fields. The statistics for each field in the
  // returned array depend on the type of the field (keyword, number, date etc).
  // Sampling will be used if supplied samplerShardSize > 0.
  async getStatsForFields(
    indexPatternTitle: string,
    query: any,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    intervalMs: number | undefined,
    maxExamples: number,
    runtimeMappings: estypes.MappingRuntimeFields
  ): Promise<BatchStats[]> {
    // Batch up fields by type, getting stats for multiple fields at a time.
    const batches: Field[][] = [];
    const batchedFields: { [key: string]: Field[][] } = {};
    each(fields, (field) => {
      if (field.fieldName === undefined) {
        // undefined fieldName is used for a document count request.
        // getDocumentCountStats requires timeField - don't add to batched requests if not defined
        if (timeFieldName !== undefined) {
          batches.push([field]);
        }
      } else {
        const fieldType = field.type;
        if (batchedFields[fieldType] === undefined) {
          batchedFields[fieldType] = [[]];
        }
        let lastArray: Field[] = last(batchedFields[fieldType]) as Field[];
        if (lastArray.length === FIELDS_REQUEST_BATCH_SIZE) {
          lastArray = [];
          batchedFields[fieldType].push(lastArray);
        }
        lastArray.push(field);
      }
    });

    each(batchedFields, (lists) => {
      batches.push(...lists);
    });

    let results: BatchStats[] = [];
    await Promise.all(
      batches.map(async (batch) => {
        let batchStats: BatchStats[] = [];
        const first = batch[0];
        switch (first.type) {
          case JOB_FIELD_TYPES.NUMBER:
            // undefined fieldName is used for a document count request.
            if (first.fieldName !== undefined) {
              batchStats = await this.getNumericFieldsStats(
                indexPatternTitle,
                query,
                batch,
                samplerShardSize,
                timeFieldName,
                earliestMs,
                latestMs,
                runtimeMappings
              );
            } else {
              // Will only ever be one document count card,
              // so no value in batching up the single request.
              if (intervalMs !== undefined) {
                const stats = await this.getDocumentCountStats(
                  indexPatternTitle,
                  query,
                  timeFieldName,
                  earliestMs,
                  latestMs,
                  intervalMs,
                  runtimeMappings
                );
                batchStats.push(stats);
              }
            }
            break;
          case JOB_FIELD_TYPES.KEYWORD:
          case JOB_FIELD_TYPES.IP:
            batchStats = await this.getStringFieldsStats(
              indexPatternTitle,
              query,
              batch,
              samplerShardSize,
              timeFieldName,
              earliestMs,
              latestMs,
              runtimeMappings
            );
            break;
          case JOB_FIELD_TYPES.DATE:
            batchStats = await this.getDateFieldsStats(
              indexPatternTitle,
              query,
              batch,
              samplerShardSize,
              timeFieldName,
              earliestMs,
              latestMs,
              runtimeMappings
            );
            break;
          case JOB_FIELD_TYPES.BOOLEAN:
            batchStats = await this.getBooleanFieldsStats(
              indexPatternTitle,
              query,
              batch,
              samplerShardSize,
              timeFieldName,
              earliestMs,
              latestMs,
              runtimeMappings
            );
            break;
          case JOB_FIELD_TYPES.TEXT:
          default:
            // Use an exists filter on the the field name to get
            // examples of the field, so cannot batch up.
            await Promise.all(
              batch.map(async (field) => {
                const stats = await this.getFieldExamples(
                  indexPatternTitle,
                  query,
                  field.fieldName,
                  timeFieldName,
                  earliestMs,
                  latestMs,
                  maxExamples,
                  runtimeMappings
                );
                batchStats.push(stats);
              })
            );
            break;
        }

        results = [...results, ...batchStats];
      })
    );

    return results;
  }

  async checkAggregatableFieldsExist(
    indexPatternTitle: string,
    query: any,
    aggregatableFields: string[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs?: number,
    latestMs?: number,
    datafeedConfig?: estypes.MlDatafeed,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    return await checkAggregatableFieldsExist(
      this._client,
      indexPatternTitle,
      query,
      aggregatableFields,
      samplerShardSize,
      timeFieldName,
      earliestMs,
      latestMs,
      datafeedConfig,
      runtimeMappings
    );
  }

  async checkNonAggregatableFieldExists(
    indexPatternTitle: string,
    query: any,
    field: string,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    return await checkNonAggregatableFieldExists(
      this._client,
      indexPatternTitle,
      query,
      field,
      timeFieldName,
      earliestMs,
      latestMs,
      runtimeMappings
    );
  }

  async getDocumentCountStats(
    indexPatternTitle: string,
    query: any,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    intervalMs: number,
    runtimeMappings: estypes.MappingRuntimeFields
  ): Promise<DocumentCountStats> {
    return await getDocumentCountStats(
      this._client,
      indexPatternTitle,
      query,
      timeFieldName,
      earliestMs,
      latestMs,
      intervalMs,
      runtimeMappings
    );
  }

  async getNumericFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    return await getNumericFieldsStats(
      this._client,
      indexPatternTitle,
      query,
      fields,
      samplerShardSize,
      timeFieldName,
      earliestMs,
      latestMs,
      runtimeMappings
    );
  }

  async getStringFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    return await getStringFieldsStats(
      this._client,
      indexPatternTitle,
      query,
      fields,
      samplerShardSize,
      timeFieldName,
      earliestMs,
      latestMs,
      runtimeMappings
    );
  }

  async getDateFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    return await getDateFieldsStats(
      this._client,
      indexPatternTitle,
      query,
      fields,
      samplerShardSize,
      timeFieldName,
      earliestMs,
      latestMs,
      runtimeMappings
    );
  }

  async getBooleanFieldsStats(
    indexPatternTitle: string,
    query: object,
    fields: Field[],
    samplerShardSize: number,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    runtimeMappings?: estypes.MappingRuntimeFields
  ) {
    return await getBooleanFieldsStats(
      this._client,
      indexPatternTitle,
      query,
      fields,
      samplerShardSize,
      timeFieldName,
      earliestMs,
      latestMs,
      runtimeMappings
    );
  }

  async getFieldExamples(
    indexPatternTitle: string,
    query: any,
    field: string,
    timeFieldName: string | undefined,
    earliestMs: number | undefined,
    latestMs: number | undefined,
    maxExamples: number,
    runtimeMappings?: estypes.MappingRuntimeFields
  ): Promise<FieldExamples> {
    return await getFieldExamples(
      this._client,
      indexPatternTitle,
      query,
      field,
      timeFieldName,
      earliestMs,
      latestMs,
      maxExamples,
      runtimeMappings
    );
  }
}
