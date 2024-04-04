/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { isValidNamespace } from '../../../common/services';

export const PackagePolicyNamespaceSchema = schema.string({
  validate: (value) => {
    const namespaceValidation = isValidNamespace(value || '', true);
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
  release: schema.maybe(
    schema.oneOf([schema.literal('ga'), schema.literal('beta'), schema.literal('experimental')])
  ),
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
        dynamic_dataset: schema.maybe(schema.boolean()),
        dynamic_namespace: schema.maybe(schema.boolean()),
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

const ExperimentalDataStreamFeatures = schema.arrayOf(
  schema.object({
    data_stream: schema.string(),
    features: schema.object({
      synthetic_source: schema.maybe(schema.boolean({ defaultValue: false })),
      tsdb: schema.maybe(schema.boolean({ defaultValue: false })),
      doc_value_only_numeric: schema.maybe(schema.boolean({ defaultValue: false })),
      doc_value_only_other: schema.maybe(schema.boolean({ defaultValue: false })),
    }),
  })
);

const PackagePolicyBaseSchema = {
  name: schema.string(),
  description: schema.maybe(schema.string()),
  namespace: schema.maybe(PackagePolicyNamespaceSchema),
  policy_id: schema.string(),
  enabled: schema.boolean(),
  is_managed: schema.maybe(schema.boolean()),
  package: schema.maybe(
    schema.object({
      name: schema.string(),
      title: schema.string(),
      version: schema.string(),
      experimental_data_stream_features: schema.maybe(ExperimentalDataStreamFeatures),
    })
  ),
  // Deprecated TODO create remove issue
  output_id: schema.maybe(schema.string()),
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
  policy_id: schema.maybe(schema.string()),
  enabled: schema.maybe(schema.boolean()),
  package: schema.maybe(
    schema.object({
      name: schema.string(),
      title: schema.maybe(schema.string()),
      version: schema.string(),
      experimental_data_stream_features: schema.maybe(ExperimentalDataStreamFeatures),
    })
  ),
  // Deprecated TODO create remove issue
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

const SimplifiedVarsSchema = schema.recordOf(
  schema.string(),
  schema.nullable(
    schema.oneOf([
      schema.boolean(),
      schema.string(),
      schema.number(),
      schema.arrayOf(schema.string()),
      schema.arrayOf(schema.number()),
    ])
  )
);

export const SimplifiedPackagePolicyBaseSchema = schema.object({
  id: schema.maybe(schema.string()),
  name: schema.string(),
  description: schema.maybe(schema.string()),
  namespace: schema.maybe(schema.string()),
  vars: schema.maybe(SimplifiedVarsSchema),
  inputs: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        enabled: schema.maybe(schema.boolean()),
        vars: schema.maybe(SimplifiedVarsSchema),
        streams: schema.maybe(
          schema.recordOf(
            schema.string(),
            schema.object({
              enabled: schema.maybe(schema.boolean()),
              vars: schema.maybe(SimplifiedVarsSchema),
            })
          )
        ),
      })
    )
  ),
});

export const SimplifiedPackagePolicyPreconfiguredSchema = SimplifiedPackagePolicyBaseSchema.extends(
  {
    id: schema.string(),
    package: schema.object({
      name: schema.string(),
    }),
  }
);

export const SimplifiedCreatePackagePolicyRequestBodySchema =
  SimplifiedPackagePolicyBaseSchema.extends({
    policy_id: schema.string(),
    force: schema.maybe(schema.boolean()),
    package: schema.object({
      name: schema.string(),
      version: schema.string(),
      experimental_data_stream_features: schema.maybe(ExperimentalDataStreamFeatures),
    }),
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
  elasticsearch: schema.maybe(
    schema.object({
      privileges: schema.maybe(
        schema.object({
          cluster: schema.maybe(schema.arrayOf(schema.string())),
        })
      ),
    })
  ),
  inputs: schema.arrayOf(
    schema.object({
      ...PackagePolicyInputsSchema,
      compiled_input: schema.maybe(schema.any()),
    })
  ),
  secret_references: schema.maybe(
    schema.arrayOf(
      schema.object({
        id: schema.string(),
      })
    )
  ),
});
