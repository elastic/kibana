/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';
import * as rt from 'io-ts';

export const allowedValueRT = rt.intersection([
  rt.type({
    description: rt.string,
    name: rt.string,
  }),
  rt.partial({
    expected_event_types: rt.array(rt.string),
    beta: rt.string,
  }),
]);

export const multiFieldRT = rt.type({
  flat_name: rt.string,
  name: rt.string,
  type: rt.string,
});

export const ecsFieldMetadataRT = rt.intersection([
  rt.type({
    dashed_name: rt.string,
    description: rt.string,
    flat_name: rt.string,
    level: rt.string,
    name: rt.string,
    normalize: rt.array(rt.string),
    short: rt.string,
    type: rt.string,
  }),
  rt.partial({
    allowed_values: allowedValueRT,
    beta: rt.string,
    doc_values: rt.boolean,
    example: rt.unknown,
    expected_values: rt.array(rt.string),
    format: rt.string,
    ignore_above: rt.number,
    index: rt.boolean,
    input_format: rt.string,
    multi_fields: rt.array(multiFieldRT),
    object_type: rt.string,
    original_fieldset: rt.string,
    output_format: rt.string,
    output_precision: rt.number,
    pattern: rt.string,
    required: rt.boolean,
    scaling_factor: rt.number,
  }),
]);

export const integrationFieldMetadataRT = rt.intersection([
  rt.type({
    name: rt.string,
    description: rt.string,
    type: rt.string,
    flat_name: rt.string,
  }),
  rt.partial({
    example: rt.unknown,
  }),
]);

export const fieldMetadataRT = rt.union([ecsFieldMetadataRT, integrationFieldMetadataRT]);

export type TEcsFields = typeof EcsFlat;
export type EcsFieldName = keyof TEcsFields;
export type IntegrationFieldName = string;

export type EcsFieldMetadata = TEcsFields[EcsFieldName];
export type IntegrationFieldMetadata = rt.TypeOf<typeof integrationFieldMetadataRT>;

export type FieldName = EcsFieldName | (IntegrationFieldName & {});
export type FieldMetadata = EcsFieldMetadata | IntegrationFieldMetadata;
