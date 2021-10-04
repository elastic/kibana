/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const nameParameterSchema = schema.object({
  name: schema.string(),
});

const snapshotConfigSchema = schema.object({
  indices: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  ignoreUnavailable: schema.maybe(schema.boolean()),
  includeGlobalState: schema.maybe(schema.boolean()),
  partial: schema.maybe(schema.boolean()),
  metadata: schema.maybe(schema.recordOf(schema.string(), schema.string())),
});

const snapshotRetentionSchema = schema.object({
  expireAfterValue: schema.maybe(schema.oneOf([schema.number(), schema.literal('')])),
  expireAfterUnit: schema.maybe(schema.string()),
  maxCount: schema.maybe(schema.oneOf([schema.number(), schema.literal('')])),
  minCount: schema.maybe(schema.oneOf([schema.number(), schema.literal('')])),
});

export const snapshotListSchema = schema.object({
  sortField: schema.oneOf([
    schema.literal('snapshot'),
    schema.literal('repository'),
    schema.literal('indices'),
    schema.literal('durationInMillis'),
    schema.literal('startTimeInMillis'),
    schema.literal('shards.total'),
    schema.literal('shards.failed'),
  ]),
  sortDirection: schema.oneOf([schema.literal('desc'), schema.literal('asc')]),
  pageIndex: schema.number(),
  pageSize: schema.number(),
  searchField: schema.maybe(
    schema.oneOf([
      schema.literal('snapshot'),
      schema.literal('repository'),
      schema.literal('policyName'),
    ])
  ),
  searchValue: schema.maybe(schema.string()),
  searchMatch: schema.maybe(schema.oneOf([schema.literal('must'), schema.literal('must_not')])),
  searchOperator: schema.maybe(schema.oneOf([schema.literal('eq'), schema.literal('exact')])),
});

export const policySchema = schema.object({
  name: schema.string(),
  snapshotName: schema.string(),
  schedule: schema.string(),
  repository: schema.string(),
  config: schema.maybe(snapshotConfigSchema),
  retention: schema.maybe(snapshotRetentionSchema),
  isManagedPolicy: schema.boolean(),
});

const fsRepositorySettings = schema.object({
  location: schema.string(),
  compress: schema.maybe(schema.boolean()),
  chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  maxRestoreBytesPerSec: schema.maybe(schema.string()),
  maxSnapshotBytesPerSec: schema.maybe(schema.string()),
  readonly: schema.maybe(schema.boolean()),
});

const fsRepositorySchema = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: fsRepositorySettings,
});

const readOnlyRepositorySettings = schema.object({
  url: schema.string(),
});

const readOnlyRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: readOnlyRepositorySettings,
});

const s3RepositorySettings = schema.object({
  bucket: schema.string(),
  client: schema.maybe(schema.string()),
  basePath: schema.maybe(schema.string()),
  compress: schema.maybe(schema.boolean()),
  chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  serverSideEncryption: schema.maybe(schema.boolean()),
  bufferSize: schema.maybe(schema.string()),
  cannedAcl: schema.maybe(schema.string()),
  storageClass: schema.maybe(schema.string()),
  maxRestoreBytesPerSec: schema.maybe(schema.string()),
  maxSnapshotBytesPerSec: schema.maybe(schema.string()),
  readonly: schema.maybe(schema.boolean()),
});

const s3Repository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: s3RepositorySettings,
});

const hdsRepositorySettings = schema.object(
  {
    uri: schema.string(),
    path: schema.string(),
    loadDefaults: schema.maybe(schema.boolean()),
    compress: schema.maybe(schema.boolean()),
    chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
    maxRestoreBytesPerSec: schema.maybe(schema.string()),
    maxSnapshotBytesPerSec: schema.maybe(schema.string()),
    readonly: schema.maybe(schema.boolean()),
    ['security.principal']: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

const hdsfRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: hdsRepositorySettings,
});

const azureRepositorySettings = schema.object({
  client: schema.maybe(schema.string()),
  container: schema.maybe(schema.string()),
  basePath: schema.maybe(schema.string()),
  locationMode: schema.maybe(schema.string()),
  compress: schema.maybe(schema.boolean()),
  chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  maxRestoreBytesPerSec: schema.maybe(schema.string()),
  maxSnapshotBytesPerSec: schema.maybe(schema.string()),
  readonly: schema.maybe(schema.boolean()),
});

const azureRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: azureRepositorySettings,
});

const gcsRepositorySettings = schema.object({
  bucket: schema.string(),
  client: schema.maybe(schema.string()),
  basePath: schema.maybe(schema.string()),
  compress: schema.maybe(schema.boolean()),
  chunkSize: schema.maybe(schema.oneOf([schema.string(), schema.literal(null)])),
  maxRestoreBytesPerSec: schema.maybe(schema.string()),
  maxSnapshotBytesPerSec: schema.maybe(schema.string()),
  readonly: schema.maybe(schema.boolean()),
});

const gcsRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: gcsRepositorySettings,
});

const sourceRepository = schema.object({
  name: schema.string(),
  type: schema.string(),
  settings: schema.oneOf([
    fsRepositorySettings,
    readOnlyRepositorySettings,
    s3RepositorySettings,
    hdsRepositorySettings,
    azureRepositorySettings,
    gcsRepositorySettings,
    schema.object(
      {
        delegateType: schema.string(),
      },
      { unknowns: 'allow' }
    ),
  ]),
});

export const repositorySchema = schema.oneOf([
  fsRepositorySchema,
  readOnlyRepository,
  sourceRepository,
  s3Repository,
  hdsfRepository,
  azureRepository,
  gcsRepository,
]);

export const restoreSettingsSchema = schema.object({
  indices: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
  renamePattern: schema.maybe(schema.string()),
  renameReplacement: schema.maybe(schema.string()),
  includeGlobalState: schema.maybe(schema.boolean()),
  partial: schema.maybe(schema.boolean()),
  indexSettings: schema.maybe(schema.string()),
  ignoreIndexSettings: schema.maybe(schema.arrayOf(schema.string())),
  ignoreUnavailable: schema.maybe(schema.boolean()),
  includeAliases: schema.maybe(schema.boolean()),
});
