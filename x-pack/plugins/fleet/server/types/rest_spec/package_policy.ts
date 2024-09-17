/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import {
  CreatePackagePolicyRequestBodySchema,
  DryRunPackagePolicySchema,
  PackagePolicyPackageSchema,
  PackagePolicyResponseSchema,
  PackagePolicyStatusResponseSchema,
  SimplifiedCreatePackagePolicyRequestBodySchema,
  UpdatePackagePolicyRequestBodySchema,
} from '../models';

import { inputsFormat } from '../../../common/constants';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE, PACKAGE_POLICIES_MAPPINGS } from '../../constants';

import { validateKuery } from '../../routes/utils/filter_utils';

import { BulkRequestBodySchema } from './common';

export const GetPackagePoliciesRequestSchema = {
  query: schema.object({
    page: schema.maybe(schema.number({ defaultValue: 1 })),
    perPage: schema.maybe(schema.number({ defaultValue: 20 })),
    sortField: schema.maybe(schema.string()),
    sortOrder: schema.maybe(schema.oneOf([schema.literal('desc'), schema.literal('asc')])),
    showUpgradeable: schema.maybe(schema.boolean()),
    kuery: schema.maybe(
      schema.string({
        validate: (value: string) => {
          const validationObj = validateKuery(
            value,
            [PACKAGE_POLICY_SAVED_OBJECT_TYPE],
            PACKAGE_POLICIES_MAPPINGS,
            true
          );
          if (validationObj?.error) {
            return validationObj?.error;
          }
        },
      })
    ),
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
    withAgentCount: schema.maybe(schema.boolean()),
  }),
};

export const BulkGetPackagePoliciesRequestSchema = {
  body: BulkRequestBodySchema,
  query: schema.object({
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
  }),
};

export const BulkGetPackagePoliciesResponseBodySchema = schema.object({
  items: schema.arrayOf(PackagePolicyResponseSchema),
});

export const GetOnePackagePolicyRequestSchema = {
  params: schema.object({
    packagePolicyId: schema.string(),
  }),
  query: schema.object({
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
  }),
};

export const CreatePackagePolicyRequestSchema = {
  body: schema.oneOf(
    [CreatePackagePolicyRequestBodySchema, SimplifiedCreatePackagePolicyRequestBodySchema],
    {
      meta: {
        description: 'You should use inputs as an object and not use the deprecated inputs array.',
      },
    }
  ),
  query: schema.object({
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
  }),
};

export const CreatePackagePolicyResponseSchema = schema.object({
  item: PackagePolicyResponseSchema,
});

export const UpdatePackagePolicyRequestSchema = {
  ...GetOnePackagePolicyRequestSchema,
  body: schema.oneOf([
    UpdatePackagePolicyRequestBodySchema,
    SimplifiedCreatePackagePolicyRequestBodySchema,
  ]),
  query: schema.object({
    format: schema.maybe(
      schema.oneOf([schema.literal(inputsFormat.Simplified), schema.literal(inputsFormat.Legacy)])
    ),
  }),
};

export const DeletePackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
    force: schema.maybe(schema.boolean()),
  }),
};

export const DeletePackagePoliciesResponseBodySchema = schema.arrayOf(
  PackagePolicyStatusResponseSchema.extends({
    policy_id: schema.maybe(
      schema.oneOf([
        schema.literal(null),
        schema.string({
          meta: {
            description: 'Use `policy_ids` instead',
            deprecated: true,
          },
        }),
      ])
    ),
    policy_ids: schema.arrayOf(schema.string()),
    output_id: schema.maybe(schema.oneOf([schema.literal(null), schema.string()])),
    package: PackagePolicyPackageSchema,
  })
);

export const DeleteOnePackagePolicyRequestSchema = {
  params: schema.object({
    packagePolicyId: schema.string(),
  }),
  query: schema.object({
    force: schema.maybe(schema.boolean()),
  }),
};

export const DeleteOnePackagePolicyResponseSchema = schema.object({
  id: schema.string(),
});

export const UpgradePackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
  }),
};

export const UpgradePackagePoliciesResponseBodySchema = schema.arrayOf(
  PackagePolicyStatusResponseSchema
);

export const DryRunPackagePoliciesRequestSchema = {
  body: schema.object({
    packagePolicyIds: schema.arrayOf(schema.string()),
    packageVersion: schema.maybe(schema.string()),
  }),
};

export const DryRunPackagePoliciesResponseBodySchema = schema.arrayOf(
  schema.object({
    name: schema.maybe(schema.string()),
    statusCode: schema.maybe(schema.number()),
    body: schema.maybe(schema.object({ message: schema.string() })),
    hasErrors: schema.boolean(),
    diff: schema.maybe(
      schema.arrayOf(
        schema.oneOf([
          PackagePolicyResponseSchema.extends({
            id: schema.maybe(schema.string()),
          }),
          DryRunPackagePolicySchema,
        ])
      )
    ),
    agent_diff: schema.maybe(
      schema.arrayOf(
        schema.arrayOf(
          schema
            .object({
              id: schema.string(),
              name: schema.string(),
              revision: schema.number(),
              type: schema.string(),
              data_stream: schema.object({
                namespace: schema.string(),
              }),
              use_output: schema.string(),
              package_policy_id: schema.string(),
              meta: schema.maybe(
                schema.object({
                  package: schema
                    .object({
                      name: schema.string(),
                      version: schema.string(),
                    })
                    .extendsDeep({
                      // equivalent of allowing extra keys like `[key: string]: any;`
                      unknowns: 'allow',
                    }),
                })
              ),
              streams: schema.maybe(
                schema.arrayOf(
                  schema
                    .object({
                      id: schema.string(),
                      data_stream: schema.object({
                        dataset: schema.string(),
                        type: schema.string(),
                      }),
                    })
                    .extendsDeep({
                      unknowns: 'allow',
                    })
                )
              ),
              processors: schema.maybe(
                schema.arrayOf(
                  schema.object({
                    add_fields: schema.object({
                      target: schema.string(),
                      fields: schema.recordOf(
                        schema.string(),
                        schema.oneOf([schema.string(), schema.number()])
                      ),
                    }),
                  })
                )
              ),
            })
            .extendsDeep({
              unknowns: 'allow',
            })
        )
      )
    ),
  })
);
