/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { arrayToStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { fieldAttributeRT, partialFieldMetadataPlainRT } from '../types';

export const findFieldsMetadataRequestQueryRT = rt.exact(
  rt.partial({
    attributes: arrayToStringRt.pipe(rt.array(fieldAttributeRT)),
    fieldNames: arrayToStringRt.pipe(rt.array(rt.string)),
    integration: rt.string,
    dataset: rt.string,
  })
);

export const findFieldsMetadataResponsePayloadRT = rt.type({
  fields: rt.record(rt.string, partialFieldMetadataPlainRT),
});

export type FindFieldsMetadataRequestQuery = rt.TypeOf<typeof findFieldsMetadataRequestQueryRT>;
export type FindFieldsMetadataResponsePayload = rt.TypeOf<
  typeof findFieldsMetadataResponsePayloadRT
>;
