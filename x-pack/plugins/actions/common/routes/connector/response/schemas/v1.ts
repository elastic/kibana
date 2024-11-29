/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const connectorResponseSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the connector.',
    },
  }),
  name: schema.string({
    meta: {
      description: ' The name of the rule.',
    },
  }),
  config: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  connector_type_id: schema.string({
    meta: { description: 'The connector type identifier.' },
  }),
  is_missing_secrets: schema.maybe(
    schema.boolean({ meta: { description: 'Indicates whether the connector is missing secrets.' } })
  ),
  is_preconfigured: schema.boolean({
    meta: {
      description:
        'Indicates whether the connector is preconfigured. If true, the `config` and `is_missing_secrets` properties are omitted from the response. ',
    },
  }),
  is_deprecated: schema.boolean({
    meta: { description: 'Indicates whether the connector is deprecated.' },
  }),
  is_system_action: schema.boolean({
    meta: { description: 'Indicates whether the connector is used for system actions.' },
  }),
});

export const allConnectorsResponseSchema = connectorResponseSchema.extends({
  referenced_by_count: schema.number({
    meta: {
      description:
        'The number of saved objects that reference the connector. If is_preconfigured is true, this value is not calculated.',
    },
  }),
});

export const connectorTypesResponseSchema = schema.object({
  id: schema.string({
    meta: {
      description: 'The identifier for the connector.',
    },
  }),
  name: schema.string({
    meta: {
      description: ' The name of the rule.',
    },
  }),
  enabled: schema.boolean({
    meta: {
      description: 'Indicates whether the connector is enabled.',
    },
  }),
  enabled_in_config: schema.boolean({
    meta: {
      description: 'Indicates whether the connector is enabled in the Kibana configuration.',
    },
  }),
  enabled_in_license: schema.boolean({
    meta: {
      description: 'Indicates whether the connector is enabled through the license.',
    },
  }),
  minimum_license_required: schema.oneOf(
    [
      schema.literal('basic'),
      schema.literal('standard'),
      schema.literal('gold'),
      schema.literal('platinum'),
      schema.literal('enterprise'),
      schema.literal('trial'),
    ],
    {
      meta: {
        description: 'The minimum license required to enable the connector.',
      },
    }
  ),
  supported_feature_ids: schema.arrayOf(schema.string(), {
    meta: {
      description: 'The minimum license required to enable the connector.',
    },
  }),
  is_system_action_type: schema.boolean({
    meta: { description: 'Indicates whether the action is a system action.' },
  }),
});

export const connectorExecuteResponseSchema = schema.object({
  connector_id: schema.string({
    meta: {
      description: 'The identifier for the connector.',
    },
  }),
  status: schema.oneOf([schema.literal('ok'), schema.literal('error')], {
    meta: {
      description: 'The outcome of the connector execution.',
    },
  }),
  message: schema.maybe(
    schema.string({
      meta: {
        description: 'The connector execution error message.',
      },
    })
  ),
  service_message: schema.maybe(
    schema.string({
      meta: {
        description: 'An error message that contains additional details.',
      },
    })
  ),
  data: schema.maybe(
    schema.any({
      meta: {
        description: 'The connector execution data.',
      },
    })
  ),
  retry: schema.maybe(
    schema.nullable(
      schema.oneOf([schema.boolean(), schema.string()], {
        meta: {
          description:
            'When the status is error, identifies whether the connector execution will retry .',
        },
      })
    )
  ),
  errorSource: schema.maybe(
    schema.oneOf([schema.literal('user'), schema.literal('framework')], {
      meta: {
        description:
          'When the status is error, identifies whether the error is a framework error or a user error.',
      },
    })
  ),
});
