/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  FindFieldsMetadataRequestQuery,
  findFieldsMetadataRequestQueryRT,
  FindFieldsMetadataResponsePayload,
  findFieldsMetadataResponsePayloadRT,
} from '../../../common/latest';
import { FIND_FIELDS_METADATA_URL } from '../../../common/fields_metadata';
import { decodeOrThrow } from '../../../common/runtime_types';
import { IFieldsMetadataClient } from './types';

export class FieldsMetadataClient implements IFieldsMetadataClient {
  constructor(private readonly http: HttpStart) {}

  public async find({
    fieldNames,
  }: FindFieldsMetadataRequestQuery): Promise<FindFieldsMetadataResponsePayload> {
    const query = findFieldsMetadataRequestQueryRT.encode({ fieldNames });

    const response = await this.http
      .get(FIND_FIELDS_METADATA_URL, { query, version: '1' })
      .catch((error) => {
        throw new Error(`Failed to fetch ecs fields ${fieldNames?.join() ?? ''}: ${error}`);
      });

    const data = decodeOrThrow(
      findFieldsMetadataResponsePayloadRT,
      (message: string) =>
        new Error(`Failed to decode ecs fields ${fieldNames?.join() ?? ''}: ${message}"`)
    )(response);

    return data;
  }
}
