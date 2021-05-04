/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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
  alertNameConfig: ConfigMapSchema,
  alertSourceConfig: ConfigMapSchema,
  caseIdConfig: ConfigMapSchema,
  caseNameConfig: schema.nullable(ConfigMapSchema),
  commentsConfig: schema.nullable(ConfigMapSchema),
  severityConfig: ConfigMapSchema,
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

export const ExecutorSubActionCreateRecordParamsSchema = schema.object({
  alertName: schema.nullable(schema.string()),
  alertSource: schema.nullable(schema.string()),
  caseId: schema.nullable(schema.string()),
  caseName: schema.nullable(schema.string()),
  comments: schema.nullable(schema.string()),
  severity: schema.nullable(schema.string()),
});

export const ExecutorSubActionGetApplicationParamsSchema = schema.object({ id: schema.string() });

export const ExecutorParamsSchema = schema.oneOf([
  schema.object({
    subAction: schema.literal('createRecord'),
    subActionParams: ExecutorSubActionCreateRecordParamsSchema,
  }),
]);
