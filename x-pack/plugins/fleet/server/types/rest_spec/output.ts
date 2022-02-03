/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const GetOneOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const DeleteOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
};

export const GetOutputsRequestSchema = {};

export const PostOutputRequestSchema = {
  body: schema.object({
    id: schema.maybe(schema.string()),
    name: schema.string(),
    type: schema.oneOf([schema.literal('elasticsearch')]),
    is_default: schema.boolean({ defaultValue: false }),
    is_default_monitoring: schema.boolean({ defaultValue: false }),
    hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
    ca_sha256: schema.maybe(schema.string()),
    ca_trusted_fingerprint: schema.maybe(schema.string()),
    config_yaml: schema.maybe(schema.string()),
  }),
};

export const PutOutputRequestSchema = {
  params: schema.object({
    outputId: schema.string(),
  }),
  body: schema.object({
    type: schema.maybe(schema.oneOf([schema.literal('elasticsearch')])),
    name: schema.maybe(schema.string()),
    is_default: schema.maybe(schema.boolean()),
    is_default_monitoring: schema.maybe(schema.boolean()),
    hosts: schema.maybe(schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }))),
    ca_sha256: schema.maybe(schema.string()),
    ca_trusted_fingerprint: schema.maybe(schema.string()),
    config_yaml: schema.maybe(schema.string()),
  }),
};
