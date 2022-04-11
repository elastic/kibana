/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isValidNamespace } from '../../../common';

export const NamespaceSchema = schema.string({
  minLength: 1,
  validate: (value) => {
    const namespaceValidation = isValidNamespace(value || '');
    if (!namespaceValidation.valid && namespaceValidation.error) {
      return namespaceValidation.error;
    }
  },
});

const ConfigRecordSchema = schema.recordOf(
  schema.string(),
  schema.object({
    type: schema.maybe(schema.string()),
    value: schema.maybe(schema.any()),
    frozen: schema.maybe(schema.boolean()),
  })
);

const PackagePolicyStreamsSchema = {
  id: schema.maybe(schema.string()), // BWC < 7.11
  enabled: schema.boolean(),
  keep_enabled: schema.maybe(schema.boolean()),
  data_stream: schema.object({
    dataset: schema.string(),
    type: schema.string(),
    elasticsearch: schema.maybe(
      schema.object({
        privileges: schema.maybe(
          schema.object({
            indices: schema.maybe(schema.arrayOf(schema.string())),
          })
        ),
      })
    ),
  }),
  vars: schema.maybe(ConfigRecordSchema),
  config: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        type: schema.maybe(schema.string()),
        value: schema.maybe(schema.any()),
      })
    )
  ),
  compiled_stream: schema.maybe(schema.any()),
};

const PackagePolicyInputsSchema = {
  type: schema.string(),
  policy_template: schema.maybe(schema.string()),
  enabled: schema.boolean(),
  keep_enabled: schema.maybe(schema.boolean()),
  vars: schema.maybe(ConfigRecordSchema),
  config: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        type: schema.maybe(schema.string()),
        value: schema.maybe(schema.any()),
      })
    )
  ),
  streams: schema.arrayOf(schema.object(PackagePolicyStreamsSchema)),
};

const PackagePolicyBaseSchema = {
  name: schema.string(),
  description: schema.maybe(schema.string()),
  namespace: NamespaceSchema,
  policy_id: schema.string(),
  enabled: schema.boolean(),
  package: schema.maybe(
    schema.object({
      name: schema.string(),
      title: schema.string(),
      version: schema.string(),
    })
  ),
  output_id: schema.string(),
  inputs: schema.arrayOf(schema.object(PackagePolicyInputsSchema)),
  vars: schema.maybe(ConfigRecordSchema),
};

export const NewPackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  id: schema.maybe(schema.string()),
  force: schema.maybe(schema.boolean()),
});

const CreatePackagePolicyProps = {
  ...PackagePolicyBaseSchema,
  namespace: schema.maybe(NamespaceSchema),
  policy_id: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  package: schema.maybe(
    schema.object({
      name: schema.string(),
      title: schema.maybe(schema.string()),
      version: schema.string(),
    })
  ),
  output_id: schema.maybe(schema.string()),
  inputs: schema.arrayOf(
    schema.object({
      ...PackagePolicyInputsSchema,
      streams: schema.maybe(schema.arrayOf(schema.object(PackagePolicyStreamsSchema))),
    })
  ),
};

export const CreatePackagePolicyRequestBodySchema = schema.object({
  ...CreatePackagePolicyProps,
  id: schema.maybe(schema.string()),
  force: schema.maybe(schema.boolean()),
});

export const UpdatePackagePolicyRequestBodySchema = schema.object({
  ...CreatePackagePolicyProps,
  name: schema.maybe(schema.string()),
  inputs: schema.maybe(
    schema.arrayOf(
      schema.object({
        ...PackagePolicyInputsSchema,
        streams: schema.maybe(schema.arrayOf(schema.object(PackagePolicyStreamsSchema))),
      })
    )
  ),
  version: schema.maybe(schema.string()),
  force: schema.maybe(schema.boolean()),
});

export const UpdatePackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  version: schema.maybe(schema.string()),
});

export const PackagePolicySchema = schema.object({
  ...PackagePolicyBaseSchema,
  id: schema.string(),
  version: schema.maybe(schema.string()),
  revision: schema.number(),
  updated_at: schema.string(),
  updated_by: schema.string(),
  created_at: schema.string(),
  created_by: schema.string(),
});
