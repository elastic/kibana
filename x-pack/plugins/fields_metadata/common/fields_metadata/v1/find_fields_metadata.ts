/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrayToStringRt } from '@kbn/io-ts-utils';
import { either } from 'fp-ts/lib/Either';
import * as rt from 'io-ts';
import { ANY_DATASET } from '../common';
import { FetchFieldsMetadataError } from '../errors';
import { FieldAttribute, fieldAttributeRT, FieldName, partialFieldMetadataPlainRT } from '../types';

const baseFindFieldsMetadataRequestQueryRT = rt.exact(
  rt.partial({
    attributes: arrayToStringRt.pipe(rt.array(fieldAttributeRT)),
    fieldNames: arrayToStringRt.pipe(rt.array(rt.string)),
    integration: rt.string,
    dataset: rt.string,
  })
);

// Define a refinement that enforces the constraint
export const findFieldsMetadataRequestQueryRT = new rt.Type(
  'FindFieldsMetadataRequestQuery',
  (query): query is rt.TypeOf<typeof baseFindFieldsMetadataRequestQueryRT> =>
    baseFindFieldsMetadataRequestQueryRT.is(query) &&
    (query.integration ? query.dataset !== undefined : true),
  (input, context) =>
    either.chain(baseFindFieldsMetadataRequestQueryRT.validate(input, context), (query) => {
      try {
        if (query.integration && !query.dataset) {
          throw new FetchFieldsMetadataError('dataset is required if integration is provided');
        }

        return rt.success(query);
      } catch (error) {
        return rt.failure(query, context, error.message);
      }
    }),
  baseFindFieldsMetadataRequestQueryRT.encode
);

export const findFieldsMetadataResponsePayloadRT = rt.type({
  fields: rt.record(rt.string, partialFieldMetadataPlainRT),
});

export type FindFieldsMetadataRequestQuery =
  | {
      attributes?: FieldAttribute[];
      fieldNames?: FieldName[];
      integration?: undefined;
      dataset?: undefined;
    }
  | {
      attributes?: FieldAttribute[];
      fieldNames?: FieldName[];
      integration: string;
      dataset: typeof ANY_DATASET | (string & {});
    };

export type FindFieldsMetadataResponsePayload = rt.TypeOf<
  typeof findFieldsMetadataResponsePayloadRT
>;
