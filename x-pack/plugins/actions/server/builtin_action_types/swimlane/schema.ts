/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';

export const ConfigMap = {
  id: schema.string(),
  key: schema.string(),
  name: schema.string(),
  fieldType: schema.string(),
};

export const ConfigMapSchema = schema.object(ConfigMap);

export const ConfigMapping = {
  alertSourceConfig: ConfigMapSchema,
  severityConfig: ConfigMapSchema,
  caseNameConfig: schema.nullable(ConfigMapSchema),
  caseIdConfig: ConfigMapSchema,
  alertNameConfig: ConfigMapSchema,
  commentsConfig: schema.nullable(ConfigMapSchema),
};

export const ConfigMappingSchema = schema.object(ConfigMapping);

export const SwimlaneServiceConfiguration = {
  apiUrl: schema.string(),
  appId: schema.string(),
  mappings: ConfigMappingSchema,
};

export const SwimlaneServiceConfigurationSchema = schema.object(SwimlaneServiceConfiguration);
// secrets definition

export const SwimlaneSecretsConfiguration = {
  apiToken: schema.string(),
};

export const SwimlaneSecretsConfigurationSchema = schema.object(SwimlaneSecretsConfiguration);

export const ExecutorSubActionSchema = schema.oneOf([
  schema.literal('application'),
  schema.literal('createRecord'),
]);

export const ExecutorSubActionCreateRecordParamsSchema = schema.object({
  alertName: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
  alertSource: schema.nullable(schema.string()),
  caseName: schema.nullable(schema.string()),
  caseId: schema.nullable(schema.string()),
  comments: schema.nullable(schema.string()),
});

export const ExecutorSubActionGetApplicationParamsSchema = schema.object({ id: schema.string() });

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('createRecord'),
    subActionParams: ExecutorSubActionCreateRecordParamsSchema,
  }),
]);
