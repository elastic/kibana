/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import type { HashedCache } from '../../../common/hashed_cache';
import {
  FindFieldsMetadataRequestQuery,
  FindFieldsMetadataResponsePayload,
} from '../../../common/latest';
import {
  DecodeFieldsMetadataError,
  FetchFieldsMetadataError,
  FieldName,
  FIND_FIELDS_METADATA_URL,
} from '../../../common/fields_metadata';
// import { decodeOrThrow } from '../../../common/runtime_types';
import { IFieldsMetadataClient } from './types';

export class FieldsMetadataClient implements IFieldsMetadataClient {
  cache?: HashedCache<FindFieldsMetadataRequestQuery, FindFieldsMetadataResponsePayload>;

  constructor(private readonly http: HttpStart) {}

  public async find(
    params: FindFieldsMetadataRequestQuery
  ): Promise<FindFieldsMetadataResponsePayload> {
    const cache = await this.loadLazyCache();

    // Initially lookup for existing results given request parameters
    if (cache.has(params)) {
      return cache.get(params) as FindFieldsMetadataResponsePayload;
    }

    const [
      { findFieldsMetadataRequestQueryRT, findFieldsMetadataResponsePayloadRT },
      { decodeOrThrow },
    ] = await Promise.all([
      import('../../../common/latest'),
      import('../../../common/runtime_types'),
    ]);

    const query = findFieldsMetadataRequestQueryRT.encode(params);

    const response = await this.http
      .get(FIND_FIELDS_METADATA_URL, { query, version: '1' })
      .catch((error) => {
        throw new FetchFieldsMetadataError(
          `Failed to fetch fields ${truncateFieldNamesList(params.fieldNames)}: ${error.message}`
        );
      });

    const data = decodeOrThrow(
      findFieldsMetadataResponsePayloadRT,
      (message: string) =>
        new DecodeFieldsMetadataError(
          `Failed decoding fields ${truncateFieldNamesList(params.fieldNames)}: ${message}`
        )
    )(response);

    // Store cached results for given request parameters
    cache.set(params, data);

    return data;
  }

  private async loadLazyCache() {
    if (!this.cache) {
      const { HashedCache } = await import('../../../common/hashed_cache');
      this.cache = new HashedCache();
    }

    return this.cache;
  }
}

const truncateFieldNamesList = (fieldNames?: FieldName[]) => {
  if (!fieldNames || fieldNames.length === 0) return '';

  const visibleFields = fieldNames.slice(0, 3);
  const additionalFieldsCount = fieldNames.length - visibleFields.length;

  return visibleFields
    .join()
    .concat(additionalFieldsCount > 0 ? `+${additionalFieldsCount} fields` : '');
};
